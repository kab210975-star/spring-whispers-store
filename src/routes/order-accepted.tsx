import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteShell } from "@/components/site/SiteShell";
import { site } from "@/lib/site";

export const Route = createFileRoute("/order-accepted")({
  head: () => ({
    meta: [
      { title: "Заявка принята | Тюльпановый сад" },
      {
        name: "description",
        content: "Мы получили заявку на букет тюльпанов и позвоним, чтобы подтвердить время доставки.",
      },
      { property: "og:title", content: "Заявка принята | Тюльпановый сад" },
      { property: "og:description", content: "Спасибо за заказ тюльпанов — мы скоро позвоним." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderAccepted,
});

function OrderAccepted() {
  return (
    <SiteShell>
      <div className="relative overflow-hidden">
        <div className="petal-blob left-1/2 top-0 h-72 w-72 -translate-x-1/2 bg-blush" />
        <div className="relative mx-auto max-w-2xl px-5 py-24 text-center">
          <p className="font-hand text-2xl text-primary">спасибо</p>
          <h1 className="mt-3 font-display text-5xl">Заявка принята</h1>
          <p className="mt-6 text-muted-foreground">
            Мы уже видим ваш заказ и позвоним в течение 15 минут в рабочее время ({site.hours}),
            чтобы подтвердить состав букета и время доставки.
          </p>
          <p className="mt-4 text-muted-foreground">
            Если удобнее позвонить самим — мы на связи:{" "}
            <a href={site.phoneHref} className="text-primary">
              {site.phone}
            </a>
          </p>
          <Link
            to="/catalog"
            className="mt-10 inline-flex h-13 items-center rounded-full bg-primary px-8 py-4 text-sm text-primary-foreground"
          >
            Вернуться в каталог
          </Link>
        </div>
      </div>
    </SiteShell>
  );
}
