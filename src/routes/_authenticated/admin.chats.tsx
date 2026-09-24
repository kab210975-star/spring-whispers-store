import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { AdminShell, NoAccess } from "@/components/site/AdminShell";
import { getMyAccess } from "@/lib/admin.functions";
import { getChat, listChats, replyToChat, setChatStatus } from "@/lib/chat-admin.functions";

export const Route = createFileRoute("/_authenticated/admin/chats")({
  head: () => ({
    meta: [
      { title: "Чаты с покупателями | Панель Тюльпановый сад" },
      { name: "description", content: "Переписки покупателей с ИИ-консультантом и обращения к оператору." },
      { property: "og:title", content: "Чаты с покупателями | Панель" },
      { property: "og:description", content: "Все чаты и обращения к оператору." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminChatsPage,
});

const statusRu = { ai: "ИИ-консультант", operator: "Оператор", closed: "Закрыт" } as const;
type Filter = "all" | "needs" | "closed";

function fmt(d: string) {
  return new Date(d).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function AdminChatsPage() {
  const fetchAccess = useServerFn(getMyAccess);
  const fetchChats = useServerFn(listChats);
  const access = useQuery({ queryKey: ["admin", "access"], queryFn: () => fetchAccess() });
  const canManage = access.data?.role === "admin" || access.data?.role === "staff";
  const chats = useQuery({
    queryKey: ["admin", "chats"],
    queryFn: () => fetchChats(),
    enabled: canManage,
    refetchInterval: 10000,
  });
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<string | null>(null);

  if (access.isLoading) return <AdminShell><p className="text-muted-foreground">Загружаем…</p></AdminShell>;
  if (!canManage) return <AdminShell role={access.data?.role}><NoAccess /></AdminShell>;

  const list = (chats.data ?? []).filter((c) =>
    filter === "needs" ? c.needs_operator || c.status === "operator" : filter === "closed" ? c.status === "closed" : true,
  );
  const needsCount = (chats.data ?? []).filter((c) => c.needs_operator).length;

  return (
    <AdminShell role={access.data?.role}>
      <h1 className="font-display text-3xl">Чаты</h1>
      <div className="mt-5 flex flex-wrap gap-2 text-sm">
        {([
          ["all", "Все"],
          ["needs", `Нужен оператор${needsCount ? ` (${needsCount})` : ""}`],
          ["closed", "Закрытые"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full border px-4 py-1.5 ${filter === key ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]">
        <ul className="max-h-[70vh] space-y-2 overflow-y-auto">
          {chats.isLoading && <li className="text-sm text-muted-foreground">Загружаем…</li>}
          {!chats.isLoading && list.length === 0 && <li className="text-sm text-muted-foreground">Чатов пока нет</li>}
          {list.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setSelected(c.id)}
                className={`w-full rounded-2xl border p-3 text-left text-sm ${selected === c.id ? "border-primary" : "border-border"} bg-card`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{c.customer_name}</span>
                  <span className="text-xs text-muted-foreground">{fmt(c.updated_at)}</span>
                </div>
                <p className="text-xs text-muted-foreground">{c.phone}</p>
                {c.last && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.last.content}</p>}
                <div className="mt-2 flex flex-wrap gap-1 text-[11px]">
                  {c.needs_operator && <span className="rounded-full bg-destructive px-2 py-0.5 text-destructive-foreground">Нужен оператор</span>}
                  {c.order_id && <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">Оформлен заказ</span>}
                  <span className="rounded-full border border-border px-2 py-0.5">{statusRu[c.status]}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
        {selected ? (
          <ChatDetail key={selected} id={selected} />
        ) : (
          <div className="rounded-3xl bg-card p-8 text-sm text-muted-foreground">Выберите чат слева</div>
        )}
      </div>
    </AdminShell>
  );
}

function ChatDetail({ id }: { id: string }) {
  const fetchChat = useServerFn(getChat);
  const reply = useServerFn(replyToChat);
  const changeStatus = useServerFn(setChatStatus);
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const chat = useQuery({ queryKey: ["admin", "chat", id], queryFn: () => fetchChat({ data: { id } }), refetchInterval: 5000 });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin", "chat", id] });
    qc.invalidateQueries({ queryKey: ["admin", "chats"] });
  };
  const send = useMutation({
    mutationFn: () => reply({ data: { id, text } }),
    onSuccess: () => { setText(""); refresh(); },
    onError: () => toast.error("Не удалось отправить"),
  });
  const status = useMutation({
    mutationFn: (s: "ai" | "operator" | "closed") => changeStatus({ data: { id, status: s } }),
    onSuccess: refresh,
    onError: () => toast.error("Не удалось изменить статус"),
  });

  if (!chat.data) return <div className="rounded-3xl bg-card p-8 text-sm text-muted-foreground">Загружаем…</div>;
  const { session, messages } = chat.data;

  return (
    <div className="flex flex-col rounded-3xl bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="font-display text-xl">{session.customer_name}</p>
          <a href={`tel:${session.phone}`} className="text-sm text-primary">{session.phone}</a>
          <p className="mt-1 text-xs text-muted-foreground">
            Начат {fmt(session.created_at)} · согласия получены · {statusRu[session.status]}
          </p>
          {session.operator_reason && <p className="mt-1 text-xs text-destructive">Причина: {session.operator_reason}</p>}
          {session.order_id && <p className="mt-1 text-xs">Заявка № {session.order_id.slice(0, 8)} — см. «Заявки»</p>}
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {session.status !== "ai" && (
            <button type="button" onClick={() => status.mutate("ai")} className="rounded-full border border-border px-3 py-1.5">Вернуть ИИ</button>
          )}
          {session.status !== "closed" && (
            <button type="button" onClick={() => status.mutate("closed")} className="rounded-full border border-border px-3 py-1.5">Закрыть обращение</button>
          )}
        </div>
      </div>
      <div className="max-h-[50vh] flex-1 space-y-3 overflow-y-auto py-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${m.role === "user" ? "bg-secondary text-secondary-foreground" : m.role === "operator" ? "bg-primary text-primary-foreground" : "border border-border"}`}>
              <p className="mb-1 text-[11px] opacity-70">
                {m.role === "user" ? "Покупатель" : m.role === "operator" ? "Оператор" : "ИИ"} · {fmt(m.created_at)}
              </p>
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); if (text.trim()) send.mutate(); }}
        className="flex gap-2 border-t border-border pt-4"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ответ покупателю от оператора…"
          rows={2}
          className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm"
        />
        <button type="submit" disabled={send.isPending || !text.trim()} className="rounded-full bg-primary px-5 text-sm text-primary-foreground disabled:opacity-50">
          Ответить
        </button>
      </form>
    </div>
  );
}
