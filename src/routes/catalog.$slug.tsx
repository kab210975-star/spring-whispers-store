import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { SiteShell } from "@/components/site/SiteShell";
import { ProductCard } from "@/components/site/ProductCard";
import { getProduct } from "@/lib/catalog.functions";
import { productImage } from "@/lib/product-images";
import { formatPrice, kindLabels, site } from "@/lib/site";
import { useCart } from "@/lib/cart";
import type { Product } from "@/lib/types";

const productQuery = (slug: string) =>
  queryOptions({
    queryKey: ["product", slug],
    queryFn: () => getProduct({ data: { slug } }),
  });

export const Route = createFileRoute("/catalog/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(productQuery(params.slug));
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Букет не найден | Тюльпановый сад" }, { name: "robots", content: "noindex" }],
      };
    }
    const title = `${loaderData.product.title} — купить в Москве | Тюльпановый сад`;
    const description =
      loaderData.product.description ??
      `${loaderData.product.title}: доставка по Москве в день заказа.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: ProductPage,
  notFoundComponent: () => (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-5 py-24 text-center">
        <h1 className="font-display text-4xl">Такого букета нет</h1>
        <Link to="/catalog" className="mt-6 inline-block text-primary">
          Вернуться в каталог
        </Link>
      </div>
    </SiteShell>
  ),
  errorComponent: () => (
    <SiteShell>
      <p className="mx-auto max-w-6xl px-5 py-20">Не удалось загрузить букет. Обновите страницу.</p>
    </SiteShell>
  ),
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(productQuery(slug));
  const cart = useCart();
  const [quantity, setQuantity] = useState(1);

  if (!data) return null;
  const product = data.product as Product;
  const similar = data.similar as Product[];

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-5 pt-10">
        <Link to="/catalog" className="text-sm text-muted-foreground hover:text-primary">
          ← Каталог
        </Link>
      </div>

      <article className="mx-auto grid max-w-6xl gap-12 px-5 py-10 lg:grid-cols-[1fr_1fr]">
        <div className="overflow-hidden rounded-[2.5rem] rounded-bl-[7rem]">
          <img
            src={productImage(product)}
            alt={product.title}
            width={1024}
            height={1280}
            className="h-full w-full object-cover"
          />
        </div>

        <div>
          <p className="font-hand text-xl text-primary">{kindLabels[product.kind]}</p>
          <h1 className="mt-2 font-display text-5xl">{product.title}</h1>
          <p className="mt-5 text-lg">{formatPrice(product.price)}</p>
          {product.description && (
            <p className="mt-6 text-base leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          )}

          <dl className="mt-8 space-y-3 text-sm">
            {product.composition && (
              <div className="flex gap-3">
                <dt className="w-28 shrink-0 text-muted-foreground">Состав</dt>
                <dd>{product.composition}</dd>
              </div>
            )}
            {product.color && (
              <div className="flex gap-3">
                <dt className="w-28 shrink-0 text-muted-foreground">Цвет</dt>
                <dd>{product.color}</dd>
              </div>
            )}
            <div className="flex gap-3">
              <dt className="w-28 shrink-0 text-muted-foreground">Наличие</dt>
              <dd>{product.in_stock ? "Есть сегодня" : "Под заказ, уточним по телефону"}</dd>
            </div>
          </dl>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <div className="flex h-14 items-center rounded-full border border-border">
              <button
                type="button"
                aria-label="Меньше"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="h-full w-12 text-lg text-muted-foreground"
              >
                −
              </button>
              <span className="w-8 text-center">{quantity}</span>
              <button
                type="button"
                aria-label="Больше"
                onClick={() => setQuantity((q) => Math.min(200, q + 1))}
                className="h-full w-12 text-lg text-muted-foreground"
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                cart.add(
                  { slug: product.slug, title: product.title, price: product.price },
                  quantity,
                );
                toast.success("Добавили в корзину", { description: product.title });
              }}
              className="h-14 rounded-full bg-primary px-9 text-base text-primary-foreground transition-opacity hover:opacity-90"
            >
              В корзину · {formatPrice(product.price * quantity)}
            </button>
          </div>

          {product.care_tip && (
            <p className="mt-8 rounded-3xl bg-blush/60 p-6 text-sm">
              <span className="font-hand text-lg text-primary">как сохранить свежесть: </span>
              {product.care_tip}
            </p>
          )}

          <p className="mt-6 text-sm text-muted-foreground">
            Доставка: {site.deliveryZone}. Заказ до 21:00 — привезём сегодня.
          </p>
        </div>
      </article>

      {similar.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="font-display text-3xl">Похожие</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </SiteShell>
  );
}
