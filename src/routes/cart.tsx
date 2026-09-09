import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { SiteShell } from "@/components/site/SiteShell";
import { useCart } from "@/lib/cart";
import { createOrder } from "@/lib/orders.functions";
import { deliveryCost, deliverySlots, formatPrice, site } from "@/lib/site";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Корзина и оформление заказа | Тюльпановый сад" },
      {
        name: "description",
        content:
          "Проверьте букеты в корзине и оставьте заявку: имя, телефон, дата и интервал доставки по Москве.",
      },
      { property: "og:title", content: "Корзина | Тюльпановый сад" },
      { property: "og:description", content: "Оформление заявки на доставку тюльпанов по Москве." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const cart = useCart();
  const navigate = useNavigate();
  const submitOrder = useServerFn(createOrder);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    customer_name: "",
    phone: "",
    delivery_date: "",
    delivery_slot: deliverySlots[0] ?? "",
    address: "",
    comment: "",
    card_text: "",
  });

  const delivery = deliveryCost(cart.subtotal);
  const total = cart.subtotal + delivery;
  const left = Math.max(0, site.freeDeliveryFrom - cart.subtotal);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (cart.items.length === 0) return;
    setSending(true);
    try {
      await submitOrder({
        data: {
          customer_name: form.customer_name,
          phone: form.phone,
          delivery_date: form.delivery_date || null,
          delivery_slot: form.delivery_slot || null,
          address: form.address || null,
          comment: form.comment || null,
          card_text: form.card_text || null,
          items: cart.items.map((item) => ({ slug: item.slug, quantity: item.quantity })),
        },
      });
      cart.clear();
      navigate({ to: "/order-accepted" });
    } catch (error) {
      console.error(error);
      toast.error("Не получилось отправить заявку", {
        description: "Проверьте имя и телефон и попробуйте ещё раз.",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-5 pb-10 pt-14">
        <p className="font-hand text-2xl text-primary">почти готово</p>
        <h1 className="mt-2 font-display text-5xl">Корзина</h1>
      </div>

      {cart.items.length === 0 ? (
        <div className="mx-auto max-w-6xl px-5 pb-24">
          <p className="text-muted-foreground">Пока пусто. Выберите букет в каталоге.</p>
          <Link
            to="/catalog"
            className="mt-6 inline-flex h-13 items-center rounded-full bg-primary px-8 py-4 text-sm text-primary-foreground"
          >
            В каталог
          </Link>
        </div>
      ) : (
        <div className="mx-auto grid max-w-6xl gap-10 px-5 pb-24 lg:grid-cols-[1.1fr_1fr]">
          <section className="space-y-4">
            {cart.items.map((item) => (
              <div
                key={item.slug}
                className="flex flex-wrap items-center gap-4 rounded-3xl bg-card p-5"
              >
                <div className="min-w-40 flex-1">
                  <p className="font-display text-xl">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{formatPrice(item.price)} за штуку</p>
                </div>
                <div className="flex h-11 items-center rounded-full border border-border">
                  <button
                    type="button"
                    aria-label="Меньше"
                    onClick={() => cart.setQuantity(item.slug, item.quantity - 1)}
                    className="h-full w-10 text-muted-foreground"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm">{item.quantity}</span>
                  <button
                    type="button"
                    aria-label="Больше"
                    onClick={() => cart.setQuantity(item.slug, item.quantity + 1)}
                    className="h-full w-10 text-muted-foreground"
                  >
                    +
                  </button>
                </div>
                <p className="w-24 text-right">{formatPrice(item.price * item.quantity)}</p>
                <button
                  type="button"
                  onClick={() => cart.remove(item.slug)}
                  className="text-sm text-muted-foreground hover:text-destructive"
                >
                  убрать
                </button>
              </div>
            ))}

            <div className="rounded-3xl bg-blush/60 p-6 text-sm">
              {left > 0 ? (
                <span>
                  До бесплатной доставки осталось {formatPrice(left)} — доставка сейчас{" "}
                  {formatPrice(delivery)}.
                </span>
              ) : (
                <span className="font-hand text-lg text-primary">Доставка бесплатная — спасибо!</span>
              )}
            </div>

            <dl className="space-y-2 rounded-3xl bg-card p-6 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Букеты</dt>
                <dd>{formatPrice(cart.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Доставка</dt>
                <dd>{delivery === 0 ? "бесплатно" : formatPrice(delivery)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-3 text-base">
                <dt>Итого</dt>
                <dd className="font-display text-xl">{formatPrice(total)}</dd>
              </div>
            </dl>
          </section>

          <form onSubmit={handleSubmit} className="space-y-4 rounded-[2.5rem] bg-card p-7">
            <h2 className="font-display text-3xl">Куда привезти</h2>
            <p className="text-sm text-muted-foreground">
              Оплата не онлайн: мы перезвоним, подтвердим состав и время, оплатить можно курьеру или
              переводом.
            </p>

            <Field label="Ваше имя" required>
              <input
                required
                minLength={2}
                value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                className="h-12 w-full rounded-2xl border border-border bg-background px-4"
              />
            </Field>

            <Field label="Телефон" required>
              <input
                required
                type="tel"
                placeholder="+7 ___ ___-__-__"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="h-12 w-full rounded-2xl border border-border bg-background px-4"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Дата доставки">
                <input
                  type="date"
                  value={form.delivery_date}
                  onChange={(e) => setForm({ ...form, delivery_date: e.target.value })}
                  className="h-12 w-full rounded-2xl border border-border bg-background px-4"
                />
              </Field>
              <Field label="Интервал">
                <select
                  value={form.delivery_slot}
                  onChange={(e) => setForm({ ...form, delivery_slot: e.target.value })}
                  className="h-12 w-full rounded-2xl border border-border bg-background px-4"
                >
                  {deliverySlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Адрес">
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Улица, дом, квартира"
                className="h-12 w-full rounded-2xl border border-border bg-background px-4"
              />
            </Field>

            <Field label="Текст открытки">
              <textarea
                rows={2}
                value={form.card_text}
                onChange={(e) => setForm({ ...form, card_text: e.target.value })}
                placeholder="Напишем от руки"
                className="w-full rounded-2xl border border-border bg-background px-4 py-3"
              />
            </Field>

            <Field label="Комментарий">
              <textarea
                rows={2}
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
                placeholder="Позвонить заранее, оставить у консьержа…"
                className="w-full rounded-2xl border border-border bg-background px-4 py-3"
              />
            </Field>

            <button
              type="submit"
              disabled={sending}
              className="h-14 w-full rounded-full bg-primary text-base text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {sending ? "Отправляем…" : `Оставить заявку · ${formatPrice(total)}`}
            </button>
            <p className="text-xs text-muted-foreground">
              Отправляя заявку, вы соглашаетесь с{" "}
              <Link to="/privacy" className="underline">
                политикой конфиденциальности
              </Link>{" "}
              и{" "}
              <Link to="/offer" className="underline">
                условиями оферты
              </Link>
              .
            </p>
          </form>
        </div>
      )}
    </SiteShell>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-muted-foreground">
        {label}
        {required && <span className="text-primary"> *</span>}
      </span>
      {children}
    </label>
  );
}
