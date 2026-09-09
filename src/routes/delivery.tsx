import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteShell } from "@/components/site/SiteShell";
import { deliverySlots, formatPrice, site } from "@/lib/site";

export const Route = createFileRoute("/delivery")({
  head: () => ({
    meta: [
      { title: "Доставка тюльпанов по Москве — зоны, сроки, цены | Тюльпановый сад" },
      {
        name: "description",
        content:
          "Доставка букетов тюльпанов по Москве и до 20 км за МКАД: интервалы, срочная доставка за 2 часа, самовывоз и оплата.",
      },
      { property: "og:title", content: "Доставка тюльпанов по Москве | Тюльпановый сад" },
      {
        property: "og:description",
        content: "Интервалы доставки, стоимость, срочная доставка и самовывоз.",
      },
    ],
  }),
  component: DeliveryPage,
});

function DeliveryPage() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-4xl px-5 pb-24 pt-14">
        <p className="font-hand text-2xl text-primary">доставка и оплата</p>
        <h1 className="mt-2 font-display text-5xl">Привозим в день заказа</h1>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <div className="rounded-3xl bg-card p-7">
            <h2 className="font-display text-2xl">Зоны и стоимость</h2>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>В пределах МКАД — {formatPrice(site.deliveryPrice)}</li>
              <li>До 20 км за МКАД — {formatPrice(site.deliveryPrice + 300)}</li>
              <li>
                Бесплатно при заказе от {formatPrice(site.freeDeliveryFrom)}
              </li>
              <li>Срочная доставка за 2 часа — плюс 500 ₽</li>
            </ul>
          </div>

          <div className="rounded-3xl bg-card p-7">
            <h2 className="font-display text-2xl">Интервалы</h2>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {deliverySlots.map((slot) => (
                <li key={slot}>{slot}</li>
              ))}
              <li>Заказ до 21:00 — доставка сегодня или в выбранный день.</li>
            </ul>
          </div>

          <div className="rounded-3xl bg-blush/60 p-7">
            <h2 className="font-display text-2xl">Самовывоз</h2>
            <p className="mt-4 text-sm text-muted-foreground">
              {site.address}. {site.hours}. Соберём букет к вашему приезду — напишите время в
              комментарии к заявке.
            </p>
          </div>

          <div className="rounded-3xl bg-sage/25 p-7">
            <h2 className="font-display text-2xl">Оплата</h2>
            <p className="mt-4 text-sm text-muted-foreground">
              Онлайн-оплаты на сайте нет. После заявки мы звоним, подтверждаем состав и время, оплата
              — курьеру картой или переводом, либо в мастерской.
            </p>
          </div>
        </div>

        <section id="contacts" className="mt-14 rounded-[2.5rem] bg-card p-8">
          <h2 className="font-display text-3xl">Контакты</h2>
          <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
            <li>
              Телефон:{" "}
              <a href={site.phoneHref} className="text-primary">
                {site.phone}
              </a>
            </li>
            <li>Почта: {site.email}</li>
            <li>Мастерская: {site.address}</li>
            <li>Часы работы: {site.hours}</li>
            <li>Зона доставки: {site.deliveryZone}</li>
          </ul>
          <Link
            to="/catalog"
            className="mt-8 inline-flex h-13 items-center rounded-full bg-primary px-8 py-4 text-sm text-primary-foreground"
          >
            Выбрать букет
          </Link>
        </section>
      </div>
    </SiteShell>
  );
}
