import { createServerFn } from "@tanstack/react-start";
import { randomUUID } from "node:crypto";
import { z } from "zod";

const orderSchema = z.object({
  customer_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(6).max(40),
  delivery_date: z.string().trim().max(20).optional().nullable(),
  delivery_slot: z.string().trim().max(40).optional().nullable(),
  address: z.string().trim().max(400).optional().nullable(),
  comment: z.string().trim().max(1000).optional().nullable(),
  card_text: z.string().trim().max(1000).optional().nullable(),
  items: z
    .array(z.object({ slug: z.string().min(1), quantity: z.number().int().min(1).max(200) }))
    .min(1)
    .max(50),
});

function newUuid() {
  return randomUUID();
}

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((input) => orderSchema.parse(input))
  .handler(async ({ data }) => {
    const { createPublicClient } = await import("./supabase-public.server");
    const supabase = createPublicClient();

    const slugs = data.items.map((i) => i.slug);
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, slug, title, price")
      .in("slug", slugs)
      .eq("is_visible", true);

    if (productsError) throw new Error(productsError.message);
    if (!products || products.length === 0) throw new Error("Товары не найдены");

    const rows = data.items
      .map((item) => {
        const product = products.find((p) => p.slug === item.slug);
        if (!product) return null;
        return {
          product_id: product.id,
          title: product.title,
          price: Number(product.price),
          quantity: item.quantity,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (rows.length === 0) throw new Error("Товары не найдены");

    const total = rows.reduce((sum, row) => sum + row.price * row.quantity, 0);
    const orderId = newUuid();

    const { error: orderError } = await supabase.from("orders").insert({
      id: orderId,
      customer_name: data.customer_name,
      phone: data.phone,
      delivery_date: data.delivery_date || null,
      delivery_slot: data.delivery_slot || null,
      address: data.address || null,
      comment: data.comment || null,
      card_text: data.card_text || null,
      total,
    });

    if (orderError) throw new Error(orderError.message);

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(rows.map((row) => ({ ...row, order_id: orderId })));

    if (itemsError) {
      // Leave the order in place so staff can see it; customer gets a clear message.
      console.error("Failed to insert order items:", itemsError);
      throw new Error("Не удалось сохранить состав заявки. Пожалуйста, свяжитесь с нами по телефону.");
    }

    return { id: orderId, total };
  });
