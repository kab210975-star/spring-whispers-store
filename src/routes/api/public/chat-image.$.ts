import { createFileRoute } from "@tanstack/react-router";

// Пути файлов содержат случайный идентификатор и не угадываются.
export const Route = createFileRoute("/api/public/chat-image/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = (params as { _splat?: string })._splat ?? "";
        if (!/^[a-f0-9-]{36}\/[a-f0-9]{32}\.(jpg|png|webp)$/.test(path)) {
          return new Response("Not found", { status: 404 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from("chat-uploads").download(path);
        if (error || !data) return new Response("Not found", { status: 404 });
        return new Response(data, {
          headers: {
            "Content-Type": data.type || "image/jpeg",
            "Cache-Control": "private, max-age=86400",
          },
        });
      },
    },
  },
});
