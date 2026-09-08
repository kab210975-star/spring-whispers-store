import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const PRODUCT_FIELDS =
  "id, slug, title, kind, price, color, composition, description, care_tip, image_url, in_stock, is_visible, sort_order";

export const listProducts = createServerFn({ method: "GET" }).handler(async () => {
  const { createPublicClient } = await import("./supabase-public.server");
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_FIELDS)
    .eq("is_visible", true)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => ({ ...p, price: Number(p.price) }));
});

export const getProduct = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ slug: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    const { createPublicClient } = await import("./supabase-public.server");
    const supabase = createPublicClient();
    const { data: product, error } = await supabase
      .from("products")
      .select(PRODUCT_FIELDS)
      .eq("slug", data.slug)
      .eq("is_visible", true)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!product) return null;

    const { data: similar } = await supabase
      .from("products")
      .select(PRODUCT_FIELDS)
      .eq("is_visible", true)
      .eq("kind", product.kind)
      .neq("slug", product.slug)
      .order("sort_order", { ascending: true })
      .limit(3);

    return {
      product: { ...product, price: Number(product.price) },
      similar: (similar ?? []).map((p) => ({ ...p, price: Number(p.price) })),
    };
  });
