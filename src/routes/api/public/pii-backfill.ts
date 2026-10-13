import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/** Шифрует старые записи, сохранённые открытым текстом. Доступ только по серверному секрету. */
export const Route = createFileRoute("/api/public/pii-backfill")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        const pii = await import("@/lib/pii.server");
        let orders = 0;
        let chats = 0;

        const { data: os } = await db
          .from("orders")
          .select("id, customer_name, phone, address, card_text")
          .is("customer_name_enc", null)
          .neq("customer_name", pii.PII_PLACEHOLDER)
          .limit(500);
        for (const o of os ?? []) {
          const { error } = await db.from("orders").update(await pii.encryptedOrderFields(o)).eq("id", o.id);
          if (!error) orders++;
        }

        const { data: cs } = await db
          .from("chat_sessions")
          .select("id, customer_name, phone")
          .is("customer_name_enc", null)
          .neq("customer_name", pii.PII_PLACEHOLDER)
          .limit(500);
        for (const c of cs ?? []) {
          const { error } = await db.from("chat_sessions").update(await pii.encryptedPersonFields(c)).eq("id", c.id);
          if (!error) chats++;
        }
        return Response.json({ orders, chats });
      },
    },
  },
});
