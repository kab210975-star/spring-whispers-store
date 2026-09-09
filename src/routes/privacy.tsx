import { createFileRoute } from "@tanstack/react-router";

import { SiteShell } from "@/components/site/SiteShell";
import { site } from "@/lib/site";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Политика конфиденциальности | Тюльпановый сад" },
      {
        name: "description",
        content:
          "Как магазин «Тюльпановый сад» собирает, использует и защищает персональные данные покупателей.",
      },
      { property: "og:title", content: "Политика конфиденциальности | Тюльпановый сад" },
      {
        property: "og:description",
        content: "Обработка персональных данных покупателей магазина тюльпанов.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <SiteShell>
      <article className="mx-auto max-w-3xl px-5 pb-24 pt-14">
        <h1 className="font-display text-4xl">Политика конфиденциальности</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Действует для сайта магазина «{site.name}». Оператор данных — {site.legalName}, ИНН{" "}
          {site.inn}.
        </p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="font-display text-2xl text-foreground">1. Какие данные мы собираем</h2>
            <p className="mt-3">
              При оформлении заявки мы просим имя, телефон, адрес и дату доставки, а также текст
              открытки и комментарий к заказу. Дополнительно сохраняются технические данные:
              содержимое корзины в браузере и дата обращения.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-foreground">2. Зачем мы их используем</h2>
            <p className="mt-3">
              Данные нужны, чтобы связаться с вами, согласовать состав букета, доставить заказ и
              решить возможные вопросы по нему. Мы не используем контакты для рассылок без вашего
              согласия.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-foreground">3. Кому передаём</h2>
            <p className="mt-3">
              Только курьеру, который доставляет ваш заказ, и в объёме, необходимом для доставки. Мы
              не продаём и не передаём данные третьим лицам для рекламы.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-foreground">4. Сколько храним</h2>
            <p className="mt-3">
              Заявки хранятся до трёх лет, чтобы мы могли подтвердить выполнение заказа и историю
              обращений. По вашему запросу удалим данные раньше.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-foreground">5. Как защищаем</h2>
            <p className="mt-3">
              Заявки поступают в закрытую панель магазина: доступ есть только у сотрудников после
              входа по логину и паролю. Данные передаются по защищённому соединению.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-foreground">6. Ваши права</h2>
            <p className="mt-3">
              Вы можете запросить копию своих данных, исправить их или отозвать согласие на
              обработку. Напишите на {site.email} или позвоните по телефону {site.phone} — ответим в
              течение трёх рабочих дней.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-foreground">7. Файлы cookie</h2>
            <p className="mt-3">
              Сайт хранит в браузере только содержимое корзины и служебные данные сессии. Это нужно
              для работы магазина, аналитических cookie мы не устанавливаем.
            </p>
          </section>
        </div>
      </article>
    </SiteShell>
  );
}
