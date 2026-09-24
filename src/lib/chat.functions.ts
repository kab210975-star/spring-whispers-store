import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function sessionByToken(token: string) {
  const db = await admin();
  const { data, error } = await db
    .from("chat_sessions")
    .select("id, status, needs_operator, customer_name, order_id")
    .eq("token", token)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Чат не найден");
  return { db, session: data };
}

const tokenSchema = z.object({ token: z.string().min(20).max(100) });

export const startChat = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        name: z.string().trim().min(2).max(120),
        phone: z.string().trim().min(6).max(40),
        privacy: z.literal(true),
        pd: z.literal(true),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { randomUUID } = await import("node:crypto");
    const db = await admin();
    const token = `${randomUUID()}${randomUUID()}`.replace(/-/g, "");
    const now = new Date().toISOString();
    const { error } = await db.from("chat_sessions").insert({
      token,
      customer_name: data.name,
      phone: data.phone,
      privacy_accepted_at: now,
      pd_consent_at: now,
    });
    if (error) throw new Error("Не удалось начать чат. Попробуйте ещё раз.");
    return { token, name: data.name };
  });

export const getChatHistory = createServerFn({ method: "POST" })
  .inputValidator((input) => tokenSchema.parse(input))
  .handler(async ({ data }) => {
    const { db, session } = await sessionByToken(data.token);
    const { data: messages } = await db
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true });
    return { status: session.status, name: session.customer_name, messages: messages ?? [] };
  });

export const getChatUpdates = createServerFn({ method: "POST" })
  .inputValidator((input) => tokenSchema.extend({ after: z.string().max(40) }).parse(input))
  .handler(async ({ data }) => {
    const { db, session } = await sessionByToken(data.token);
    const { data: messages } = await db
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("session_id", session.id)
      .eq("role", "operator")
      .gt("created_at", data.after)
      .order("created_at", { ascending: true });
    return { status: session.status, messages: messages ?? [] };
  });

/** Сообщение покупателя, когда чат ведёт оператор (без ИИ). */
export const sendVisitorMessage = createServerFn({ method: "POST" })
  .inputValidator((input) => tokenSchema.extend({ text: z.string().trim().min(1).max(4000) }).parse(input))
  .handler(async ({ data }) => {
    const { db, session } = await sessionByToken(data.token);
    const { error } = await db
      .from("chat_messages")
      .insert({ session_id: session.id, role: "user", content: data.text });
    if (error) throw new Error("Сообщение не отправлено");
    await db
      .from("chat_sessions")
      .update({ updated_at: new Date().toISOString(), needs_operator: true })
      .eq("id", session.id);
    return { ok: true };
  });

export const callOperator = createServerFn({ method: "POST" })
  .inputValidator((input) => tokenSchema.parse(input))
  .handler(async ({ data }) => {
    const { db, session } = await sessionByToken(data.token);
    await db
      .from("chat_sessions")
      .update({
        status: "operator",
        needs_operator: true,
        operator_reason: "Покупатель нажал «Позвать оператора»",
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id);
    return { ok: true };
  });
