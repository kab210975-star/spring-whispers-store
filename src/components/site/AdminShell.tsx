import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { listChats } from "@/lib/chat-admin.functions";
import { site } from "@/lib/site";

function ChatBadge() {
  const fetchChats = useServerFn(listChats);
  const chats = useQuery({ queryKey: ["admin", "chats"], queryFn: () => fetchChats(), refetchInterval: 15000 });
  const n = (chats.data ?? []).filter((c) => c.needs_operator).length;
  if (!n) return null;
  return (
    <span className="rounded-full bg-destructive px-1.5 text-[11px] text-destructive-foreground">{n}</span>
  );
}

export function AdminShell({
  children,
  role,
}: {
  children: ReactNode;
  role?: "admin" | "staff" | null | undefined;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const isAdmin = role === "admin";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-5 px-5 py-4">
          <div>
            <p className="font-display text-lg">{site.name}</p>
            <p className="text-xs text-muted-foreground">панель магазина</p>
          </div>
          <nav className="flex gap-5 text-sm">
            <Link
              to="/admin"
              activeOptions={{ exact: true }}
              activeProps={{ className: "text-primary" }}
              className="text-muted-foreground hover:text-primary"
            >
              Заявки
            </Link>
            <Link
              to="/admin/products"
              activeProps={{ className: "text-primary" }}
              className="text-muted-foreground hover:text-primary"
            >
              Товары
            </Link>
            <Link
              to="/admin/chats"
              activeProps={{ className: "text-primary" }}
              className="flex items-center gap-1 text-muted-foreground hover:text-primary"
            >
              Чаты
              <ChatBadge />
            </Link>
            {isAdmin && (
              <Link
                to="/admin/staff"
                activeProps={{ className: "text-primary" }}
                className="text-muted-foreground hover:text-primary"
              >
                Сотрудники
              </Link>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-4 text-sm">
            <Link to="/" className="text-muted-foreground hover:text-primary">
              На сайт
            </Link>
            <button type="button" onClick={signOut} className="text-muted-foreground hover:text-primary">
              Выйти
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10">{children}</main>
    </div>
  );
}

export function NoAccess() {
  return (
    <div className="rounded-3xl bg-card p-8">
      <h1 className="font-display text-2xl">Нет доступа</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Этот раздел доступен только сотрудникам магазина. Войдите через страницу «Вход для сотрудников».
      </p>
    </div>
  );
}
