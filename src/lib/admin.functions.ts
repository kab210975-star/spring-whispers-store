import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const PRODUCT_FIELDS =
  "id, slug, title, kind, price, color, composition, description, care_tip, image_url, in_stock, is_visible, sort_order";

/** Создаёт профиль сотрудника; первый сотрудник получает права администратора. */
export const registerStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ full_name: z.string().trim().max(120).default("") }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: role, error } = await context.supabase.rpc("register_staff_member", {
      _full_name: data.full_name,
    });
    if (error) throw new Error(error.message);
    return { role: role as "admin" | "staff" };
  });

export const getMyAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", context.userId)
      .maybeSingle();

    return { isAdmin: Boolean(isAdmin), profile: profile ?? null };
  });

export const listOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("orders")
      .select(
        "id, created_at, customer_name, phone, delivery_date, delivery_slot, address, comment, card_text, total, status, admin_note, order_items(id, title, price, quantity)",
      )
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []).map((order) => ({
      ...order,
      total: Number(order.total),
      order_items: (order.order_items ?? []).map((item) => ({ ...item, price: Number(item.price) })),
    }));
  });

export const updateOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["new", "in_progress", "delivered", "cancelled"]).optional(),
        admin_note: z.string().trim().max(2000).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch: { status?: "new" | "in_progress" | "delivered" | "cancelled"; admin_note?: string | null } = {};
    if (data.status) patch.status = data.status;
    if (data.admin_note !== undefined) patch.admin_note = data.admin_note || null;

    const { error } = await context.supabase.from("orders").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAllProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("products")
      .select(PRODUCT_FIELDS)
      .order("sort_order", { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []).map((p) => ({ ...p, price: Number(p.price) }));
  });

const productSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Только латиница, цифры и дефис"),
  title: z.string().trim().min(2).max(160),
  kind: z.enum(["bouquet", "single", "gift"]),
  price: z.number().min(0).max(1000000),
  color: z.string().trim().max(80).optional().nullable(),
  composition: z.string().trim().max(600).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  care_tip: z.string().trim().max(600).optional().nullable(),
  image_url: z.string().trim().max(600).optional().nullable(),
  in_stock: z.boolean(),
  is_visible: z.boolean(),
  sort_order: z.number().int().min(0).max(10000),
});

export const saveProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => productSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { id, ...values } = data;
    const payload = {
      ...values,
      color: values.color || null,
      composition: values.composition || null,
      description: values.description || null,
      care_tip: values.care_tip || null,
      image_url: values.image_url || null,
    };

    if (id) {
      const { error } = await context.supabase.from("products").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }

    const { data: created, error } = await context.supabase
      .from("products")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id as string };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profiles, error } = await context.supabase
      .from("profiles")
      .select("id, email, full_name, created_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const { data: roles } = await context.supabase.from("user_roles").select("user_id, role");

    return (profiles ?? []).map((profile) => ({
      ...profile,
      isAdmin: (roles ?? []).some((r) => r.user_id === profile.id && r.role === "admin"),
    }));
  });

export const setAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ user_id: z.string().uuid(), admin: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    if (data.admin) {
      const { error } = await context.supabase
        .from("user_roles")
        .upsert({ user_id: data.user_id, role: "admin" }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      if (data.user_id === context.userId) throw new Error("Нельзя снять права с себя");
      const { error } = await context.supabase
        .from("user_roles")
        .delete()
        .eq("user_id", data.user_id)
        .eq("role", "admin");
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
