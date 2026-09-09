import { createFileRoute } from "@tanstack/react-router";

import { SiteShell } from "@/components/site/SiteShell";
import { formatPrice, site } from "@/lib/site";

export const Route = createFileRoute("/offer")({
  head: () => ({
    meta: [
      { title: "Публичная оферта | Тюльпановый сад" },
      {
        name: "description",
        content:
          "Условия покупки и доставки букетов тюльпанов: оформление заявки, оплата, замена цветов, возврат и гарантии свежести.",
      },
      { property: "og:title", content: "Публичная оферта | Тюльпановый сад" },
      {
        property: "og:description",
        content: "Условия заказа, доставки и возврата букетов тюльпанов.",
      },
    ],
  }),
  component: OfferPage,
});

function OfferPage() {
  return (
    <SiteShell>
      <article className="mx-auto max-w-3xl px-5 pb-24 pt-14">
        <h1 className="font-display text-4xl">Публичная оферта</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Продавец: {site.legalName}, ИНН {site.inn}, ОГРНИП {site.ogr}, адрес: {site.address}.
          Оформляя заявку, покупатель принимает условия ниже.
        </p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="font-display text-2xl text-foreground">1. Предмет</h2>
            <p className="mt-3">
              Продавец передаёт покупателю букеты тюльпанов, отдельные цветы и сопутствующие товары,
              указанные в каталоге, а покупатель оплачивает их и принимает доставку.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-foreground">2. Оформление заказа</h2>
            <p className="mt-3">
              Заявка на сайте — это запрос на покупку. Договор считается заключённым после того, как
              сотрудник магазина подтвердил по телефону состав, стоимость и время доставки.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-foreground">3. Цена и оплата</h2>
            <p className="mt-3">
              Цены указаны в рублях и включают сборку букета. Доставка рассчитывается отдельно и
              бесплатна при заказе от {formatPrice(site.freeDeliveryFrom)}. Оплата производится
              курьеру картой, переводом или в мастерской при самовывозе.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-foreground">4. Доставка</h2>
            <p className="mt-3">
              Доставка выполняется по зоне «{site.deliveryZone}» в выбранный интервал. Курьер звонит
              заранее. Если получателя нет на месте, мы ждём 15 минут, далее согласуем повторную
              доставку — она оплачивается отдельно.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-foreground">5. Замена цветов</h2>
            <p className="mt-3">
              Тюльпаны — сезонный живой товар. Продавец может заменить сорт или оттенок на
              равноценный, сохранив количество цветов и стоимость букета, предварительно предупредив
              покупателя.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-foreground">6. Качество и претензии</h2>
            <p className="mt-3">
              Мы гарантируем свежесть цветов в момент вручения. Претензии по качеству принимаются в
              течение 24 часов с фотографией букета по телефону {site.phone} или на {site.email}. При
              подтверждённом дефекте мы заменяем букет или возвращаем оплату.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-foreground">7. Отмена и возврат</h2>
            <p className="mt-3">
              Отменить заказ можно не позднее чем за 3 часа до начала интервала доставки — оплата
              возвращается полностью. Срезанные цветы относятся к товарам, не подлежащим возврату
              надлежащего качества.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-foreground">8. Персональные данные</h2>
            <p className="mt-3">
              Данные обрабатываются в объёме, необходимом для выполнения заказа, согласно политике
              конфиденциальности магазина.
            </p>
          </section>
        </div>
      </article>
    </SiteShell>
  );
}
