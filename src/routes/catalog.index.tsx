import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { SiteShell } from "@/components/site/SiteShell";
import { ProductCard } from "@/components/site/ProductCard";
import { listProducts } from "@/lib/catalog.functions";
import { kindLabels } from "@/lib/site";
import type { Product, ProductKind } from "@/lib/types";

const productsQuery = queryOptions({
  queryKey: ["products", "public"],
  queryFn: () => listProducts(),
});

export const Route = createFileRoute("/catalog/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery),
  head: () => ({
    meta: [
      { title: "Каталог тюльпанов — букеты, поштучно, подарки | Тюльпановый сад" },
      {
        name: "description",
        content:
          "Каталог весенних букетов тюльпанов, тюльпаны поштучно, вазы и открытки. Фильтры по цвету и цене, доставка по Москве.",
      },
      { property: "og:title", content: "Каталог тюльпанов — Тюльпановый сад" },
      {
        property: "og:description",
        content: "Букеты тюльпанов, поштучные цветы и подарки с доставкой по Москве.",
      },
    ],
  }),
  component: CatalogPage,
  errorComponent: () => (
    <SiteShell>
      <p className="mx-auto max-w-6xl px-5 py-20">Каталог временно недоступен. Обновите страницу.</p>
    </SiteShell>
  ),
});

type SortKey = "popular" | "cheap" | "expensive";

function CatalogPage() {
  const { data } = useSuspenseQuery(productsQuery);
  const products = data as Product[];

  const [kind, setKind] = useState<ProductKind | "all">("all");
  const [color, setColor] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("popular");

  const colors = useMemo(
    () => Array.from(new Set(products.map((p) => p.color).filter((c): c is string => Boolean(c)))),
    [products],
  );

  const visible = useMemo(() => {
    const filtered = products.filter(
      (p) => (kind === "all" || p.kind === kind) && (color === "all" || p.color === color),
    );
    if (sort === "cheap") return [...filtered].sort((a, b) => a.price - b.price);
    if (sort === "expensive") return [...filtered].sort((a, b) => b.price - a.price);
    return filtered;
  }, [products, kind, color, sort]);

  return (
    <SiteShell>
      <section className="relative overflow-hidden">
        <div className="petal-blob right-[-5rem] top-0 h-64 w-64 bg-blush" />
        <div className="relative mx-auto max-w-6xl px-5 pb-10 pt-14">
          <p className="font-hand text-2xl text-primary">каталог</p>
          <h1 className="mt-2 max-w-2xl font-display text-5xl">Весенняя витрина</h1>
          <p className="mt-5 max-w-xl text-muted-foreground">
            Букеты, тюльпаны поштучно и мелочи к ним. Всё, что видите — есть сегодня.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-card p-5">
          <div className="flex flex-wrap gap-2">
            {(["all", "bouquet", "single", "gift"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setKind(value)}
                className={`h-10 rounded-full px-5 text-sm transition-colors ${
                  kind === value
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:text-primary"
                }`}
              >
                {value === "all" ? "Всё" : kindLabels[value]}
              </button>
            ))}
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              <span className="text-muted-foreground">Цвет</span>
              <select
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="h-10 rounded-full border border-border bg-background px-4"
              >
                <option value="all">любой</option>
                {colors.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <span className="text-muted-foreground">Сортировка</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortKey)}
                className="h-10 rounded-full border border-border bg-background px-4"
              >
                <option value="popular">по популярности</option>
                <option value="cheap">сначала дешевле</option>
                <option value="expensive">сначала дороже</option>
              </select>
            </label>
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="py-20 text-center text-muted-foreground">
            По этим условиям ничего не нашлось — попробуйте другой цвет.
          </p>
        ) : (
          <div className="grid gap-6 py-12 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((product, index) => (
              <div key={product.id} className={index % 3 === 1 ? "lg:mt-12" : undefined}>
                <ProductCard product={product} tall={index % 3 === 1} />
              </div>
            ))}
          </div>
        )}
      </div>
    </SiteShell>
  );
}
