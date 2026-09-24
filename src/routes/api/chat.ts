import { createFileRoute } from "@tanstack/react-router";
import { stepCountIs, streamText, tool, type ModelMessage, type UIMessage } from "ai";
import { z } from "zod";

import { createLovableResponses } from "@/lib/ai-gateway.server";
import { asAttachments, type Attachment, type BouquetCard, type ProductCard } from "@/lib/chat-attachments";
import { imageSchema } from "@/lib/chat.functions";
import { chatImageDataUrl } from "@/lib/chat-upload.server";
import { deliveryCost, deliverySlots, site } from "@/lib/site";

type Body = { token?: unknown; message?: unknown; images?: unknown };

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
        const imgParse = z.array(imageSchema).max(4).safeParse(body.images ?? []);
        if (!imgParse.success) return new Response("Некорректные вложения", { status: 400 });
        if (!userText && imgParse.data.length === 0) return new Response("Пустое сообщение", { status: 400 });

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("ИИ не настроен", { status: 500 });

        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        const { data: session } = await db
          .from("chat_sessions")
          .select("id, status, customer_name, phone, order_id")
          .eq("token", token)
          .maybeSingle();
        if (!session) return new Response("Чат не найден", { status: 404 });
        const images = imgParse.data.filter((i) => i.path.startsWith(`${session.id}/`));
        if (session.status !== "ai") {
          return new Response("Чат ведёт оператор", { status: 409 });
        }

        const [{ data: history }, { data: products }] = await Promise.all([
          db
            .from("chat_messages")
            .select("role, content, attachments")
            .eq("session_id", session.id)
            .order("created_at", { ascending: true })
            .limit(80),
          db
            .from("products")
            .select("id, slug, title, kind, price, color, composition, description, in_stock, image_url")
            .eq("is_visible", true)
            .order("sort_order", { ascending: true }),
        ]);

        const { error: saveErr } = await db
          .from("chat_messages")
          .insert({ session_id: session.id, role: "user", content: userText, attachments: images });
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
Любые суммы считай только инструментом calculate_bouquet — покупатель увидит карточку сборки с фото и итогом.
Когда предлагаешь конкретные товары из каталога, ОБЯЗАТЕЛЬНО вызови show_products с их slug — покупатель увидит карточки с фото и ценой. Не перечисляй товары без показа.
Если покупатель прислал фото букета — опиши, что видишь (цвет, количество, стиль), и подбери максимально похожий вариант из каталога или собери такой из тюльпанов поштучно.
Доставка: ${site.deliveryPrice} ₽ в пределах МКАД, бесплатно от ${site.freeDeliveryFrom} ₽; до 20 км за МКАД +300 ₽; интервалы: ${deliverySlots.join(", ")}.
Оформление: когда покупатель выбрал состав — уточни дату, интервал, адрес, текст открытки (по желанию), покажи итог с суммой и спроси явное подтверждение. Только после слов «да/подтверждаю/оформляйте» вызови create_order. Имя и телефон уже есть: ${session.customer_name}, ${session.phone}.
${session.order_id ? "В этом чате уже оформлена заявка." : ""}
Если вопрос вне твоих возможностей (жалоба, возврат, оплата, особые условия, нестандартная просьба) или покупатель просит человека — вызови request_operator и скажи, что оператор скоро подключится.

Каталог (slug | название | тип | цена | наличие):
${catalogText}`;

        const describe = (att: Attachment[]) =>
          att
            .map((a) =>
              a.type === "product"
                ? `[показан товар: ${a.title}, ${a.price} ₽]`
                : a.type === "bouquet"
                  ? `[показана сборка: ${a.items.map((i) => `${i.title} ×${i.quantity}`).join(", ")}; итого ${a.total} ₽]`
                  : "",
            )
            .filter(Boolean)
            .join(" ");
        const rows = history ?? [];
        const imageBudget = { left: 6 };
        const userParts = async (text: string, att: Attachment[]) => {
          const parts: ({ type: "text"; text: string } | { type: "image"; image: URL })[] = [];
          if (text) parts.push({ type: "text", text });
          for (const a of att) {
            if (a.type !== "image" || imageBudget.left <= 0) continue;
            const url = await chatImageDataUrl(a.path, a.mime);
            if (url) {
              imageBudget.left--;
              parts.push({ type: "image", image: new URL(url) });
            }
          }
          if (!parts.length) parts.push({ type: "text", text: "(фото)" });
          return parts;
        };
        const current: ModelMessage = { role: "user", content: await userParts(userText, images) };
        const past: ModelMessage[] = [];
        for (const m of rows) {
          const att = asAttachments(m.attachments);
          if (m.role === "user") {
            past.push({ role: "user", content: await userParts(m.content, att) });
          } else {
            const txt = `${m.role === "operator" ? "[Оператор магазина]: " : ""}${m.content} ${describe(att)}`.trim();
            past.push({ role: "assistant", content: txt || "…" });
          }
        }
        const shown: Attachment[] = [];

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
          messages: [...past, current],
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
                const card: BouquetCard = {
                  type: "bouquet",
                  items: ok.map((l) => ({
                    slug: l.product.slug,
                    title: l.product.title,
                    price: l.product.price,
                    quantity: l.quantity,
                    image_url: l.product.image_url,
                  })),
                  subtotal,
                  delivery,
                  total: subtotal + delivery,
                };
                if (ok.length) shown.push(card);
                return {
                  card,
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
            show_products: tool({
              description: "Показать покупателю карточки товаров из каталога (фото, название, цена).",
              inputSchema: z.object({ slugs: z.array(z.string()).describe("slug товаров, до 6") }),
              execute: async ({ slugs }) => {
                const cards: ProductCard[] = slugs
                  .slice(0, 6)
                  .map((slug) => catalog.find((c) => c.slug === slug))
                  .filter((p): p is NonNullable<typeof p> => !!p)
                  .map((p) => ({
                    type: "product",
                    product_id: p.id,
                    slug: p.slug,
                    title: p.title,
                    price: p.price,
                    kind: p.kind,
                    in_stock: p.in_stock,
                    image_url: p.image_url,
                  }));
                shown.push(...cards);
                return { cards, shown: cards.length };
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
            if (!text && !shown.length) return;
            const { error } = await db
              .from("chat_messages")
              .insert({ session_id: session.id, role: "assistant", content: text, attachments: shown });
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
