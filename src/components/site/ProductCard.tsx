import { Link } from "@tanstack/react-router";

import { formatPrice, kindLabels } from "@/lib/site";
import { productImage } from "@/lib/product-images";
import type { Product } from "@/lib/types";

export function ProductCard({ product, tall = false }: { product: Product; tall?: boolean }) {
  return (
    <Link
      to="/catalog/$slug"
      params={{ slug: product.slug }}
      className="group flex flex-col overflow-hidden rounded-3xl bg-card transition-shadow hover:shadow-[var(--shadow-petal)]"
    >
      <div className={`overflow-hidden ${tall ? "aspect-[3/4]" : "aspect-[4/5]"}`}>
        <img
          src={productImage(product)}
          alt={product.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-5">
        <span className="font-hand text-base text-primary">{kindLabels[product.kind]}</span>
        <h3 className="font-display text-xl">{product.title}</h3>
        {product.composition && (
          <p className="text-sm text-muted-foreground">{product.composition}</p>
        )}
        <p className="mt-3 text-base">{formatPrice(product.price)}</p>
        {!product.in_stock && <p className="text-xs text-muted-foreground">Нет в наличии</p>}
      </div>
    </Link>
  );
}
