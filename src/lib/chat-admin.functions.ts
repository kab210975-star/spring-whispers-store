import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ProductCard } from "./chat-attachments";

async function assertStaff(context: { supabase: any; userId: string }) {
  const [a, s] = await Promise.all([
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "staff" }),
  ]);
  if (!a.data && !s.data) throw new Error("Нет доступа");
}

export const uploadOperatorImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), mime: z.string().max(40), base64: z.string().min(10).max(7_500_000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { uploadChatImage } = await import("./chat-upload.server");
    return uploadChatImage(data.id, data.mime, data.base64);
  });

export const listChatCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("products")
      .select("id, slug, title, price, kind, in_stock, image_url")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listChats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("chat_sessions")
      .select(
        "id, customer_name, phone, status, needs_operator, operator_reason, order_id, created_at, updated_at, chat_messages(content, role, created_at)",
      )
      .order("updated_at", { ascending: false })
      .order("created_at", { referencedTable: "chat_messages", ascending: false })
      .limit(1, { referencedTable: "chat_messages" })
      .limit(300);
    if (error) throw new Error(error.message);
    return (data ?? []).map(({ chat_messages, ...s }) => ({ ...s, last: chat_messages?.[0] ?? null }));
  });

export const getChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const [{ data: session, error }, { data: messages }] = await Promise.all([
      context.supabase
        .from("chat_sessions")
        .select("id, customer_name, phone, status, needs_operator, operator_reason, order_id, created_at, privacy_accepted_at, pd_consent_at")
        .eq("id", data.id)
        .maybeSingle(),
      context.supabase
        .from("chat_messages")
        .select("id, role, content, created_at, attachments")
        .eq("session_id", data.id)
        .order("created_at", { ascending: true }),
    ]);
    if (error) throw new Error(error.message);
    if (!session) throw new Error("Чат не найден");
    return { session, messages: messages ?? [] };
  });

export const replyToChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        text: z.string().trim().max(4000),
        product_ids: z.array(z.string().uuid()).max(12).default([]),
        images: z
          .array(z.object({ type: z.literal("image"), path: z.string().max(200), mime: z.enum(["image/jpeg", "image/png", "image/webp"]) }))
          .max(4)
          .default([]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const images = data.images.filter((i) => i.path.startsWith(`${data.id}/`));
    let cards: ProductCard[] = [];
    if (data.product_ids.length) {
      const { data: prods } = await context.supabase
        .from("products")
        .select("id, slug, title, price, kind, in_stock, image_url")
        .in("id", data.product_ids);
      cards = (prods ?? []).map((p) => ({
        type: "product" as const,
        product_id: p.id,
        slug: p.slug,
        title: p.title,
        price: Number(p.price),
        kind: p.kind,
        in_stock: p.in_stock,
        image_url: p.image_url,
      }));
    }
    if (!data.text && !cards.length && !images.length) throw new Error("Пустое сообщение");
    const { error } = await context.supabase
      .from("chat_messages")
      .insert({ session_id: data.id, role: "operator", content: data.text, attachments: [...images, ...cards] });
    if (error) throw new Error(error.message);
    await context.supabase
      .from("chat_sessions")
      .update({ status: "operator", needs_operator: false, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    return { ok: true };
  });

export const setChatStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), status: z.enum(["ai", "operator", "closed"]) }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("chat_sessions")
      .update({
        status: data.status,
        ...(data.status === "operator" ? {} : { needs_operator: false }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
