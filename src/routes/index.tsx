import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";

import { SiteShell } from "@/components/site/SiteShell";
import { ProductCard } from "@/components/site/ProductCard";
import { listProducts } from "@/lib/catalog.functions";
import { heroImage } from "@/lib/product-images";
import { site } from "@/lib/site";
import type { Product } from "@/lib/types";

const productsQuery = queryOptions({
  queryKey: ["products", "public"],
  queryFn: () => listProducts(),
});

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery),
  head: () => ({
    meta: [
      { title: "Тюльпановый сад — тюльпаны с доставкой по Москве" },
      {
        name: "description",
        content:
          "Свежие тюльпаны и весенние букеты с доставкой по Москве в день заказа. Букеты, тюльпаны поштучно, вазы и открытки.",
      },
      { property: "og:title", content: "Тюльпановый сад — тюльпаны с доставкой по Москве" },
      {
        property: "og:description",
        content: "Весенние букеты тюльпанов, доставка по Москве сегодня до 21:00.",
      },
    ],
  }),
  component: HomePage,
  errorComponent: () => (
    <SiteShell>
      <p className="mx-auto max-w-6xl px-5 py-20">Не удалось загрузить каталог. Обновите страницу.</p>
    </SiteShell>
  ),
});

function HomePage() {
  const { data } = useSuspenseQuery(productsQuery);
  const products = data as Product[];
  const week = products.filter((p) => p.kind === "bouquet").slice(0, 4);

  return (
    <SiteShell>
      <h1 className="sr-only">Тюльпаны с доставкой по Москве</h1>

      <section className="relative overflow-hidden">
        <div className="petal-blob left-[-8rem] top-10 h-80 w-80 bg-blush" />
        <div className="petal-blob right-[-6rem] top-40 h-72 w-72 bg-sage/40" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-14 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
          <div>
            <p className="font-hand text-2xl text-primary">весна приехала в Москву</p>
            <p className="mt-4 font-display text-[2.7rem] leading-[1.05] sm:text-6xl">
              Тюльпаны,
              <br />
              срезанные утром
            </p>
            <p className="mt-6 max-w-md text-base text-muted-foreground">
              Собираем букеты небольшими партиями и привозим в день заказа: {site.deliveryZone}.
              Заказ сегодня до 21:00 — цветы приедут свежими и закрытыми, чтобы раскрыться у вас дома.
            </p>
            <div className="mt-9">
              <Link
                to="/catalog"
                className="inline-flex h-14 items-center rounded-full bg-primary px-9 text-base text-primary-foreground transition-opacity hover:opacity-90"
              >
                Собрать букет
              </Link>
            </div>
            <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 text-sm">
              <div>
                <dt className="font-display text-2xl">2 часа</dt>
                <dd className="text-muted-foreground">срочная доставка</dd>
              </div>
              <div>
                <dt className="font-display text-2xl">от 9</dt>
                <dd className="text-muted-foreground">тюльпанов в букете</dd>
              </div>
              <div>
                <dt className="font-display text-2xl">7 дней</dt>
                <dd className="text-muted-foreground">стоят в вазе</dd>
              </div>
            </dl>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-[3rem] rounded-tr-[8rem]">
              <img
                src={heroImage}
                alt="Букет белых тюльпанов в крафтовой бумаге"
                width={1600}
                height={1200}
                className="h-full w-full object-cover"
              />
            </div>
            <p className="absolute -bottom-6 left-6 max-w-[15rem] rounded-3xl bg-card px-6 py-4 font-hand text-lg text-foreground shadow-[var(--shadow-petal)]">
              «Собираем так, как собрали бы для мамы»
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-hand text-xl text-primary">выбор недели</p>
            <h2 className="font-display text-4xl">Тюльпаны недели</h2>
          </div>
          <Link to="/catalog" className="text-sm text-muted-foreground hover:text-primary">
            Весь каталог →
          </Link>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {week.map((product, index) => (
            <div key={product.id} className={index % 2 === 1 ? "lg:mt-10" : undefined}>
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </section>

      <section className="bg-blush/50 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <p className="font-hand text-xl text-primary">как мы собираем</p>
          <h2 className="font-display text-4xl">Три шага до букета</h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              {
                title: "Утренняя срезка",
                text: "Забираем тюльпаны у подмосковных теплиц рано утром — они ещё закрытые и прохладные.",
              },
              {
                title: "Сборка вручную",
                text: "Складываем букет по одному цветку, добавляем бумагу, ленту и вашу открытку.",
              },
              {
                title: "Доставка в интервал",
                text: "Курьер везёт букет в машине с прохладой и звонит за 15 минут до вручения.",
              },
            ].map((step, index) => (
              <li key={step.title} className="rounded-3xl bg-card p-8">
                <span className="font-display text-5xl text-primary/40">0{index + 1}</span>
                <h3 className="mt-4 font-display text-2xl">{step.title}</h3>
                <p className="mt-3 text-sm text-muted-foreground">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <p className="font-hand text-xl text-primary">отзывы</p>
        <h2 className="font-display text-4xl">Что пишут покупатели</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            {
              text: "Заказала утром, к обеду букет уже стоял на столе у мамы. Тюльпаны раскрывались ещё пять дней.",
              author: "Аня, Хамовники",
            },
            {
              text: "Просил собрать 41 малиновый тюльпан — получилось именно то, что представлял. Спасибо за открытку от руки.",
              author: "Игорь, Митино",
            },
            {
              text: "Беру поштучно каждую пятницу. Всегда свежие и всегда вовремя.",
              author: "Лиза, Басманный",
            },
          ].map((review) => (
            <figure key={review.author} className="rounded-3xl border border-border bg-card/60 p-8">
              <blockquote className="text-base leading-relaxed">{review.text}</blockquote>
              <figcaption className="mt-5 font-hand text-lg text-primary">{review.author}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8">
        <div className="flex flex-col items-start gap-6 rounded-[2.5rem] bg-sage/25 p-10 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-3xl">Сегодня до 21:00 по Москве</h2>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              Доставка {site.deliveryZone}. Бесплатно при заказе от{" "}
              {site.freeDeliveryFrom.toLocaleString("ru-RU")} ₽, срочная — в течение двух часов.
            </p>
          </div>
          <Link
            to="/delivery"
            className="inline-flex h-13 items-center rounded-full border border-foreground/20 px-8 py-4 text-sm transition-colors hover:border-primary hover:text-primary"
          >
            Условия доставки
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
