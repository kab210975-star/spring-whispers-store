export type ProductCard = {
  type: "product";
  product_id: string;
  slug: string;
  title: string;
  price: number;
  kind: string;
  in_stock: boolean;
  image_url: string | null;
};
export type BouquetLine = { slug: string; title: string; price: number; quantity: number; image_url: string | null };
export type BouquetCard = { type: "bouquet"; items: BouquetLine[]; subtotal: number; delivery: number; total: number };
export type ImageAttachment = { type: "image"; path: string; mime: string };
export type Attachment = ProductCard | BouquetCard | ImageAttachment;

export function chatImageUrl(path: string) {
  return `/api/public/chat-image/${path}`;
}

export function asAttachments(value: unknown): Attachment[] {
  return Array.isArray(value) ? (value as Attachment[]) : [];
}
