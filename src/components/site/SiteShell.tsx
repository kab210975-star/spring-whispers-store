import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Menu, ShoppingBag, X } from "lucide-react";

import { site } from "@/lib/site";
import { useCart } from "@/lib/cart";

const navLinks = [
  { to: "/catalog", label: "Каталог" },
  { to: "/delivery", label: "Доставка" },
  { to: "/offer", label: "Оферта" },
] as const;

function Header() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-5 py-4">
        <Link to="/" className="flex flex-col leading-none" onClick={() => setOpen(false)}>
          <span className="font-display text-xl text-foreground">{site.name}</span>
          <span className="font-hand text-base text-primary">тюльпаны из Москвы</span>
        </Link>

        <nav className="ml-auto hidden items-center gap-7 text-sm md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-muted-foreground transition-colors hover:text-primary"
              activeProps={{ className: "text-primary" }}
            >
              {link.label}
            </Link>
          ))}
          <a href={site.phoneHref} className="text-foreground">
            {site.phone}
          </a>
        </nav>

        <Link
          to="/cart"
          className="relative ml-auto flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm text-primary-foreground transition-opacity hover:opacity-90 md:ml-0"
        >
          <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Корзина</span>
          {count > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-foreground px-1.5 text-xs text-primary">
              {count}
            </span>
          )}
        </Link>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Меню"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-border/60 bg-card px-5 py-4 md:hidden">
          <ul className="flex flex-col gap-3 text-base">
            {navLinks.map((link) => (
              <li key={link.to}>
                <Link to={link.to} onClick={() => setOpen(false)} className="text-foreground">
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <a href={site.phoneHref} className="text-primary">
                {site.phone}
              </a>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-card/70">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-2xl">{site.name}</p>
          <p className="mt-3 text-sm text-muted-foreground">
            Небольшая мастерская тюльпанов.&nbsp;
            <br />
            Срезаем утром, привозим в тот же день.
          </p>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-display text-lg">Контакты</p>
          <ul className="space-y-2 text-muted-foreground">
            <li>
              <a href={site.phoneHref} className="hover:text-primary">
                {site.phone}
              </a>
            </li>
            <li>{site.email}</li>
            <li>{site.address}</li>
            <li>{site.hours}</li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-display text-lg">Разделы</p>
          <ul className="space-y-2 text-muted-foreground">
            <li>
              <Link to="/catalog" className="hover:text-primary">
                Каталог
              </Link>
            </li>
            <li>
              <Link to="/delivery" className="hover:text-primary">
                Доставка и оплата
              </Link>
            </li>
            <li>
              <Link to="/cart" className="hover:text-primary">
                Корзина
              </Link>
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-display text-lg">Документы</p>
          <ul className="space-y-2 text-muted-foreground">
            <li>
              <Link to="/privacy" className="hover:text-primary">
                Политика конфиденциальности
              </Link>
            </li>
            <li>
              <Link to="/offer" className="hover:text-primary">
                Публичная оферта
              </Link>
            </li>
            <li>
              <Link to="/auth" className="hover:text-primary">
                Вход для сотрудников
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 px-5 py-5 text-center text-xs text-muted-foreground">
        {site.legalName} · ИНН {site.inn} · Доставка: {site.deliveryZone}
      </div>
    </footer>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
