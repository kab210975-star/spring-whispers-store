const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function uploadChatImage(sessionId: string, mime: string, base64: string) {
  const ext = EXT[mime];
  if (!ext) throw new Error("Поддерживаются JPG, PNG и WebP");
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length === 0 || bytes.length > 5 * 1024 * 1024) throw new Error("Файл должен быть до 5 МБ");
  const { randomUUID } = await import("node:crypto");
  const path = `${sessionId}/${randomUUID().replace(/-/g, "")}.${ext}`;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.storage.from("chat-uploads").upload(path, bytes, { contentType: mime });
  if (error) throw new Error("Не удалось загрузить фото");
  return { type: "image" as const, path, mime };
}

export async function chatImageDataUrl(path: string, mime: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage.from("chat-uploads").download(path);
  if (!data) return null;
  const b64 = Buffer.from(await data.arrayBuffer()).toString("base64");
  return `data:${mime};base64,${b64}`;
}
