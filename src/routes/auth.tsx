import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { registerStaff } from "@/lib/admin.functions";
import { site } from "@/lib/site";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Вход для сотрудников | Тюльпановый сад" },
      {
        name: "description",
        content: "Вход в панель магазина «Тюльпановый сад»: заявки покупателей и управление товарами.",
      },
      { property: "og:title", content: "Вход для сотрудников | Тюльпановый сад" },
      { property: "og:description", content: "Панель заявок и товаров магазина тюльпанов." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const ensureStaff = useServerFn(registerStaff);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/admin", replace: true });
    });
  }, [navigate]);

  async function afterSignIn(name: string) {
    try {
      await ensureStaff({ data: { full_name: name } });
    } catch (error) {
      console.error(error);
    }
    navigate({ to: "/admin", replace: true });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/auth" },
        });
        if (error) throw error;
        if (!data.session) {
          setNotice("Мы отправили письмо для подтверждения. Откройте ссылку из письма и войдите.");
          return;
        }
        await afterSignIn(fullName);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await afterSignIn(fullName);
    } catch (error) {
      console.error(error);
      toast.error("Не удалось войти", { description: "Проверьте почту и пароль." });
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/auth",
    });
    if (result.error) {
      setBusy(false);
      toast.error("Вход через Google не удался");
      return;
    }
    if (result.redirected) return;
    await afterSignIn(fullName);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-16">
      <div className="w-full max-w-md rounded-[2.5rem] bg-card p-9 shadow-[var(--shadow-petal)]">
        <Link to="/" className="font-hand text-lg text-primary">
          ← {site.name}
        </Link>
        <h1 className="mt-4 font-display text-3xl">
          {mode === "signin" ? "Вход для сотрудников" : "Регистрация сотрудника"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Панель заявок и товаров магазина. Первый зарегистрированный сотрудник становится
          администратором.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          {mode === "signup" && (
            <label className="block text-sm">
              <span className="mb-1.5 block text-muted-foreground">Имя</span>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-12 w-full rounded-2xl border border-border bg-background px-4"
              />
            </label>
          )}
          <label className="block text-sm">
            <span className="mb-1.5 block text-muted-foreground">Почта</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 w-full rounded-2xl border border-border bg-background px-4"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-muted-foreground">Пароль</span>
            <input
              required
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 w-full rounded-2xl border border-border bg-background px-4"
            />
          </label>

          {notice && <p className="rounded-2xl bg-blush/60 p-4 text-sm">{notice}</p>}

          <button
            type="submit"
            disabled={busy}
            className="h-13 w-full rounded-full bg-primary py-4 text-sm text-primary-foreground disabled:opacity-60"
          >
            {mode === "signin" ? "Войти" : "Зарегистрироваться"}
          </button>
        </form>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy}
          className="mt-3 h-13 w-full rounded-full border border-border py-4 text-sm disabled:opacity-60"
        >
          Продолжить с Google
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-5 w-full text-sm text-muted-foreground hover:text-primary"
        >
          {mode === "signin" ? "Ещё нет аккаунта — зарегистрироваться" : "У меня уже есть аккаунт"}
        </button>
      </div>
    </div>
  );
}
