const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Отправляет администратору уведомление о новой заявке. Никогда не бросает ошибку. */
export async function notifyNewOrder(orderId: string, source: string) {
  try {
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const tgKey = process.env["TELEGRAM_API_KEY"];
    const chatIds = (process.env["TELEGRAM_ADMIN_CHAT_ID"] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (!lovableKey || !tgKey || chatIds.length === 0) {
      console.warn("[telegram] уведомление пропущено: не настроены ключи или чат администратора");
      return;
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: o } = await supabaseAdmin
      .from("orders")
      .select("id, customer_name, phone, delivery_date, delivery_slot, address, card_text, comment, total, order_items(title, price, quantity)")
      .eq("id", orderId)
      .maybeSingle();
    if (!o) return;
    const items = (o.order_items ?? []).map((i: any) => `• ${esc(i.title)} ×${i.quantity} — ${Number(i.price) * i.quantity} ₽`).join("\n");
    const lines = [
      `🌷 <b>Новая заявка №${o.id.slice(0, 8)}</b> (${esc(source)})`,
      `👤 ${esc(o.customer_name)}, ${esc(o.phone)}`,
      items,
      `💰 Итого: <b>${Number(o.total)} ₽</b>`,
      o.delivery_date || o.delivery_slot ? `📅 ${esc(o.delivery_date ?? "")} ${esc(o.delivery_slot ?? "")}` : "",
      o.address ? `📍 ${esc(o.address)}` : "",
      o.card_text ? `💌 Открытка: ${esc(o.card_text)}` : "",
      o.comment ? `📝 ${esc(o.comment)}` : "",
      `\n<a href="https://spring-whispers-store.lovable.app/admin">Открыть заявки</a>`,
    ].filter(Boolean);
    for (const chat_id of chatIds) {
      const res = await fetch(`${GATEWAY_URL}/sendMessage`, {
        method: "POST",
        headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": tgKey, "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id, text: lines.join("\n"), parse_mode: "HTML", disable_web_page_preview: true }),
      });
      if (!res.ok) console.error(`[telegram] sendMessage ${res.status}: ${await res.text()}`);
    }
  } catch (e) {
    console.error("[telegram] ошибка уведомления", e);
  }
}
