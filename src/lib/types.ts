export type ProductKind = "bouquet" | "single" | "gift";
export type OrderStatus = "new" | "in_progress" | "delivered" | "cancelled";

export type Product = {
  id: string;
  slug: string;
  title: string;
  kind: ProductKind;
  price: number;
  color: string | null;
  composition: string | null;
  description: string | null;
  care_tip: string | null;
  image_url: string | null;
  in_stock: boolean;
  is_visible: boolean;
  sort_order: number;
};

export type OrderItem = {
  id: string;
  title: string;
  price: number;
  quantity: number;
};

export type Order = {
  id: string;
  created_at: string;
  customer_name: string;
  phone: string;
  delivery_date: string | null;
  delivery_slot: string | null;
  address: string | null;
  comment: string | null;
  card_text: string | null;
  total: number;
  status: OrderStatus;
  admin_note: string | null;
  order_items: OrderItem[];
};
