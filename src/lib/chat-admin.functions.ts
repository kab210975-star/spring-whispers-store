import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
        .select("id, role, content, created_at")
        .eq("session_id", data.id)
        .order("created_at", { ascending: true }),
    ]);
    if (error) throw new Error(error.message);
    if (!session) throw new Error("Чат не найден");
    return { session, messages: messages ?? [] };
  });

export const replyToChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), text: z.string().trim().min(1).max(4000) }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("chat_messages")
      .insert({ session_id: data.id, role: "operator", content: data.text });
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
