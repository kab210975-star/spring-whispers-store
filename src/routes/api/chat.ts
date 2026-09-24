import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, stepCountIs, streamText, tool, type ModelMessage, type UIMessage } from "ai";
import { z } from "zod";

import { createLovableResponses } from "@/lib/ai-gateway.server";
import { deliveryCost, deliverySlots, site } from "@/lib/site";

type Body = { token?: unknown; message?: unknown };

const kindRu: Record<string, string> = { bouquet: "букет", single: "поштучно", gift: "подарок" };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as Body;
        const token = typeof body.token === "string" ? body.token : "";
        const message = body.message as UIMessage | undefined;
        if (!token || !message || !Array.isArray(message.parts)) {
          return new Response("Некорректный запрос", { status: 400 });
        }
        const userText = message.parts
          .map((p) => (p.type === "text" ? p.text : ""))
          .join("")
          .trim()
          .slice(0, 4000);
        if (!userText) return new Response("Пустое сообщение", { status: 400 });

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("ИИ не настроен", { status: 500 });

        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        const { data: session } = await db
          .from("chat_sessions")
          .select("id, status, customer_name, phone, order_id")
          .eq("token", token)
          .maybeSingle();
        if (!session) return new Response("Чат не найден", { status: 404 });
        if (session.status !== "ai") {
          return new Response("Чат ведёт оператор", { status: 409 });
        }

        const [{ data: history }, { data: products }] = await Promise.all([
          db
            .from("chat_messages")
            .select("role, content")
            .eq("session_id", session.id)
            .order("created_at", { ascending: true })
            .limit(80),
          db
            .from("products")
            .select("id, slug, title, kind, price, color, composition, description, in_stock")
            .eq("is_visible", true)
            .order("sort_order", { ascending: true }),
        ]);

        const { error: saveErr } = await db
          .from("chat_messages")
          .insert({ session_id: session.id, role: "user", content: userText });
        if (saveErr) return new Response("Не удалось сохранить сообщение", { status: 500 });
        await db.from("chat_sessions").update({ updated_at: new Date().toISOString() }).eq("id", session.id);

        const catalog = (products ?? []).map((p) => ({ ...p, price: Number(p.price) }));
        const catalogText = catalog
          .map(
            (p) =>
              `- ${p.slug} | ${p.title} | ${kindRu[p.kind] ?? p.kind} | ${p.price} ₽${p.kind === "single" ? " за шт." : ""} | ${p.in_stock ? "в наличии" : "НЕТ В НАЛИЧИИ"}${p.color ? ` | цвет: ${p.color}` : ""}${p.composition ? ` | состав: ${p.composition}` : ""}`,
          )
          .join("\n");

        const system = `Ты — флорист-консультант магазина «${site.name}» (тюльпаны, ${site.deliveryZone}). Общайся по-русски, тепло, коротко, на «вы». Покупателя зовут ${session.customer_name}.
Работай ТОЛЬКО с товарами из каталога ниже, не выдумывай товары и цены. Товары «нет в наличии» не предлагай.
Помогай выбрать готовый букет (повод, бюджет, цвет) или собрать свой из тюльпанов поштучно и подарков.
Любые суммы считай только инструментом calculate_bouquet.
Доставка: ${site.deliveryPrice} ₽ в пределах МКАД, бесплатно от ${site.freeDeliveryFrom} ₽; до 20 км за МКАД +300 ₽; интервалы: ${deliverySlots.join(", ")}.
Оформление: когда покупатель выбрал состав — уточни дату, интервал, адрес, текст открытки (по желанию), покажи итог с суммой и спроси явное подтверждение. Только после слов «да/подтверждаю/оформляйте» вызови create_order. Имя и телефон уже есть: ${session.customer_name}, ${session.phone}.
${session.order_id ? "В этом чате уже оформлена заявка." : ""}
Если вопрос вне твоих возможностей (жалоба, возврат, оплата, особые условия, нестандартная просьба) или покупатель просит человека — вызови request_operator и скажи, что оператор скоро подключится.

Каталог (slug | название | тип | цена | наличие):
${catalogText}`;

        const past: ModelMessage[] = (history ?? []).map((m) =>
          m.role === "user"
            ? { role: "user", content: m.content }
            : { role: "assistant", content: m.role === "operator" ? `[Оператор магазина]: ${m.content}` : m.content },
        );
        const current = await convertToModelMessages([message]);

        const findItems = (items: { slug: string; quantity: number }[]) => {
          const lines = items.map((i) => {
            const p = catalog.find((c) => c.slug === i.slug);
            return p ? { product: p, quantity: i.quantity } : null;
          });
          const missing = items.filter((_, idx) => !lines[idx]).map((i) => i.slug);
          const ok = lines.filter((l): l is NonNullable<typeof l> => l !== null);
          const subtotal = ok.reduce((s, l) => s + l.product.price * l.quantity, 0);
          return { ok, missing, subtotal };
        };

        const itemsSchema = z.array(
          z.object({ slug: z.string().describe("slug товара из каталога"), quantity: z.number().describe("количество") }),
        );

        const lovable = createLovableResponses(key, request.headers.get("X-Lovable-AIG-Run-ID") ?? undefined);

        const result = streamText({
          model: lovable.responses("openai/gpt-6-astra"),
          system,
          messages: [...past, ...current],
          stopWhen: stepCountIs(50),
          tools: {
            calculate_bouquet: tool({
              description: "Посчитать стоимость набора товаров с доставкой по реальным ценам.",
              inputSchema: z.object({
                items: itemsSchema,
                outside_mkad: z.boolean().describe("доставка за МКАД"),
              }),
              execute: async ({ items, outside_mkad }) => {
                const { ok, missing, subtotal } = findItems(items);
                const delivery = deliveryCost(subtotal) + (outside_mkad ? 300 : 0);
                return {
                  lines: ok.map((l) => ({
                    title: l.product.title,
                    price: l.product.price,
                    quantity: l.quantity,
                    sum: l.product.price * l.quantity,
                    in_stock: l.product.in_stock,
                  })),
                  missing,
                  subtotal,
                  delivery,
                  total: subtotal + delivery,
                };
              },
            }),
            create_order: tool({
              description: "Оформить заявку. Только после явного подтверждения покупателя.",
              inputSchema: z.object({
                items: itemsSchema,
                delivery_date: z.string().nullable().describe("YYYY-MM-DD"),
                delivery_slot: z.string().nullable(),
                address: z.string().nullable(),
                card_text: z.string().nullable(),
                comment: z.string().nullable(),
              }),
              execute: async (input) => {
                const { ok, missing, subtotal } = findItems(
                  input.items.map((i) => ({ slug: i.slug, quantity: Math.max(1, Math.min(200, Math.round(i.quantity))) })),
                );
                if (ok.length === 0) return { ok: false, error: "Товары не найдены", missing };
                const { randomUUID } = await import("node:crypto");
                const orderId = randomUUID();
                const date = input.delivery_date && /^\d{4}-\d{2}-\d{2}$/.test(input.delivery_date) ? input.delivery_date : null;
                const { error } = await db.from("orders").insert({
                  id: orderId,
                  customer_name: session.customer_name,
                  phone: session.phone,
                  delivery_date: date,
                  delivery_slot: input.delivery_slot?.slice(0, 40) || null,
                  address: input.address?.slice(0, 400) || null,
                  card_text: input.card_text?.slice(0, 1000) || null,
                  comment: `Из чата с ИИ-консультантом. ${input.comment ?? ""}`.slice(0, 1000),
                  total: subtotal,
                });
                if (error) return { ok: false, error: "Не удалось сохранить заявку" };
                const { error: itemsErr } = await db.from("order_items").insert(
                  ok.map((l) => ({
                    order_id: orderId,
                    product_id: l.product.id,
                    title: l.product.title,
                    price: l.product.price,
                    quantity: l.quantity,
                  })),
                );
                if (itemsErr) return { ok: false, error: "Не удалось сохранить состав заявки" };
                await db.from("chat_sessions").update({ order_id: orderId }).eq("id", session.id);
                return { ok: true, order_number: orderId.slice(0, 8), subtotal, missing };
              },
            }),
            request_operator: tool({
              description: "Позвать живого оператора магазина и передать ему чат.",
              inputSchema: z.object({ reason: z.string().describe("кратко: почему нужен оператор") }),
              execute: async ({ reason }) => {
                await db
                  .from("chat_sessions")
                  .update({
                    status: "operator",
                    needs_operator: true,
                    operator_reason: reason.slice(0, 500),
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", session.id);
                return { ok: true };
              },
            }),
          },
          providerOptions: {
            openai: {
              forceReasoning: true,
              reasoningEffort: "low",
              reasoningSummary: "auto",
              store: false,
              include: ["reasoning.encrypted_content"],
            },
          },
        });

        return result.toUIMessageStreamResponse({
          originalMessages: [message],
          onFinish: async ({ responseMessage }) => {
            const text = responseMessage.parts
              .map((p) => (p.type === "text" ? p.text : ""))
              .join("\n")
              .trim();
            if (!text) return;
            const { error } = await db
              .from("chat_messages")
              .insert({ session_id: session.id, role: "assistant", content: text });
            if (error) console.error("chat save failed", error);
          },
          onError: (error) => {
            const msg = error instanceof Error ? error.message : String(error);
            if (msg.includes("402")) return "Консультант временно недоступен. Позвоните нам, пожалуйста.";
            if (msg.includes("429")) return "Слишком много запросов, попробуйте через минуту.";
            return "Консультант не смог ответить. Попробуйте ещё раз или позовите оператора.";
          },
        });
      },
    },
  },
});
