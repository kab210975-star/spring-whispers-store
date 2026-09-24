import { Link } from "@tanstack/react-router";

import { type Attachment, chatImageUrl } from "@/lib/chat-attachments";
import { productImage } from "@/lib/product-images";

const rub = (n: number) => `${n.toLocaleString("ru-RU")} ₽`;

export function ChatAttachments({ items, linkable = true }: { items: Attachment[]; linkable?: boolean }) {
  if (!items.length) return null;
  return (
    <div className="flex w-full flex-col gap-2">
      {items.map((a, i) => {
        if (a.type === "image") {
          return (
            <a key={i} href={chatImageUrl(a.path)} target="_blank" rel="noreferrer">
              <img src={chatImageUrl(a.path)} alt="Фото букета" className="max-h-56 rounded-2xl border border-border object-cover" />
            </a>
          );
        }
        if (a.type === "product") {
          const body = (
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-background p-2 text-left text-foreground">
              <img src={productImage(a)} alt={a.title} className="h-16 w-16 shrink-0 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{a.title}</p>
                <p className="text-sm text-primary">
                  {rub(a.price)}
                  {a.kind === "single" ? " / шт." : ""}
                </p>
                <p className="text-xs text-muted-foreground">{a.in_stock ? "В наличии" : "Нет в наличии"}</p>
              </div>
              {linkable && <span className="shrink-0 text-xs text-primary">Открыть →</span>}
            </div>
          );
          return linkable ? (
            <Link key={i} to="/catalog/$slug" params={{ slug: a.slug }}>
              {body}
            </Link>
          ) : (
            <div key={i}>{body}</div>
          );
        }
        return (
          <div key={i} className="rounded-2xl border border-border bg-background p-3 text-foreground">
            <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Ваш букет</p>
            <ul className="space-y-2">
              {a.items.map((l, j) => (
                <li key={j} className="flex items-center gap-2 text-sm">
                  <img src={productImage(l)} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  <span className="min-w-0 flex-1 truncate">
                    {l.title} × {l.quantity}
                  </span>
                  <span>{rub(l.price * l.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 space-y-0.5 border-t border-border pt-2 text-sm">
              <p className="flex justify-between text-muted-foreground">
                <span>Доставка</span>
                <span>{a.delivery ? rub(a.delivery) : "бесплатно"}</span>
              </p>
              <p className="flex justify-between font-medium">
                <span>Итого</span>
                <span>{rub(a.total)}</span>
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
