import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { AdminShell, NoAccess } from "@/components/site/AdminShell";
import { deleteOrder, getMyAccess, listOrders, updateOrder } from "@/lib/admin.functions";
import { formatPrice, statusLabels } from "@/lib/site";
import type { Order, OrderStatus } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Заявки покупателей | Панель Тюльпановый сад" },
      { name: "description", content: "Список заявок магазина тюльпанов со статусами и заметками." },
      { property: "og:title", content: "Заявки покупателей | Панель" },
      { property: "og:description", content: "Управление заявками магазина тюльпанов." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminOrdersPage,
});

const statusOrder: OrderStatus[] = ["new", "in_progress", "delivered", "cancelled"];

function AdminOrdersPage() {
  const fetchAccess = useServerFn(getMyAccess);
  const fetchOrders = useServerFn(listOrders);
  const saveOrder = useServerFn(updateOrder);
  const removeOrder = useServerFn(deleteOrder);
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");

  const access = useQuery({ queryKey: ["admin", "access"], queryFn: () => fetchAccess() });
  const canManage = access.data?.role === "admin" || access.data?.role === "staff";
  const isAdmin = access.data?.role === "admin";
  const orders = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: () => fetchOrders(),
    enabled: canManage,
  });

  const mutation = useMutation({
    mutationFn: (input: { id: string; status?: OrderStatus; admin_note?: string }) =>
      saveOrder({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      toast.success("Заявка обновлена");
    },
    onError: () => toast.error("Не удалось сохранить"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeOrder({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      toast.success("Заявка удалена");
    },
    onError: () => toast.error("Не удалось удалить заявку"),
  });

  if (access.isLoading) {
    return (
      <AdminShell>
        <p className="text-muted-foreground">Загружаем…</p>
      </AdminShell>
    );
  }

  if (!canManage) {
    return (
      <AdminShell role={access.data?.role}>
        <NoAccess />
      </AdminShell>
    );
  }

  const allOrders = (orders.data ?? []) as Order[];
  const q = search.trim().toLowerCase();
  const qDigits = q.replace(/\D/g, "");
  const list = allOrders.filter(
    (order) =>
      (filter === "all" || order.status === filter) &&
      (!date || order.delivery_date === date) &&
      (!q ||
        order.customer_name.toLowerCase().includes(q) ||
        (qDigits.length > 0 && order.phone.replace(/\D/g, "").includes(qDigits))),
  );
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const today = new Date().toDateString();
  const statusTone: Record<OrderStatus, string> = {
    new: "bg-primary text-primary-foreground",
    in_progress: "bg-accent text-accent-foreground",
    delivered: "bg-secondary text-secondary-foreground",
    cancelled: "bg-muted text-muted-foreground",
  };

  return (
    <AdminShell role={access.data?.role ?? null}>
      <h1 className="font-display text-3xl">Заявки</h1>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statusOrder.map((status) => {
          const items = allOrders.filter((o) => o.status === status);
          return (
            <button
              key={status}
              type="button"
              onClick={() => setFilter(status)}
              className="rounded-3xl bg-card p-5 text-left hover:ring-2 hover:ring-primary/40"
            >
              <span className={`inline-flex rounded-full px-3 py-1 text-xs ${statusTone[status]}`}>
                {statusLabels[status]}
              </span>
              <p className="mt-3 font-display text-3xl">{items.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                сегодня: {items.filter((o) => new Date(o.created_at).toDateString() === today).length} · за неделю:{" "}
                {items.filter((o) => new Date(o.created_at).getTime() >= weekAgo).length}
              </p>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Имя или телефон"
          className="h-9 w-52 rounded-full border border-border bg-background px-4 text-sm"
        />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Дата доставки
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 rounded-full border border-border bg-background px-3 text-sm text-foreground"
          />
        </label>
        {(["all", ...statusOrder] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`h-9 rounded-full px-4 text-sm ${
              filter === value ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"
            }`}
          >
            {value === "all" ? "Все" : statusLabels[value]}
          </button>
        ))}
        {(search || date || filter !== "all") && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setDate("");
              setFilter("all");
            }}
            className="h-9 px-3 text-sm text-primary hover:underline"
          >
            Сбросить
          </button>
        )}
      </div>

      {orders.isLoading ? (
        <p className="mt-10 text-muted-foreground">Загружаем заявки…</p>
      ) : list.length === 0 ? (
        <p className="mt-10 text-muted-foreground">Заявок пока нет.</p>
      ) : (
        <ul className="mt-8 space-y-4">
          {list.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              isAdmin={isAdmin}
              onSave={(input) => mutation.mutate({ id: order.id, ...input })}
              onDelete={() => deleteMutation.mutate(order.id)}
              saving={mutation.isPending || deleteMutation.isPending}
            />
          ))}
        </ul>
      )}
    </AdminShell>
  );
}

function OrderCard({
  order,
  isAdmin,
  onSave,
  onDelete,
  saving,
}: {
  order: Order;
  isAdmin: boolean;
  onSave: (input: { status?: OrderStatus; admin_note?: string }) => void;
  onDelete: () => void;
  saving: boolean;
}) {
  const [note, setNote] = useState(order.admin_note ?? "");

  return (
    <li className="rounded-3xl bg-card p-6">
      <div className="flex flex-wrap items-start gap-5">
        <div className="min-w-52 flex-1">
          <p className="font-display text-xl">{order.customer_name}</p>
          <p className="text-sm text-muted-foreground">
            <a href={`tel:${order.phone}`} className="hover:text-primary">
              {order.phone}
            </a>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Создана {new Date(order.created_at).toLocaleString("ru-RU")}
          </p>
        </div>

        <div className="min-w-52 flex-1 text-sm">
          <p className="text-muted-foreground">Доставка</p>
          <p>
            {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString("ru-RU") : "дата не выбрана"}
            {order.delivery_slot ? `, ${order.delivery_slot}` : ""}
          </p>
          <p className="text-muted-foreground">{order.address ?? "адрес уточняется"}</p>
        </div>

        <div className="min-w-40 text-sm">
          <p className="text-muted-foreground">Сумма</p>
          <p className="font-display text-xl">{formatPrice(order.total)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={order.status}
            onChange={(event) => onSave({ status: event.target.value as OrderStatus })}
            disabled={saving}
            className="h-10 rounded-full border border-border bg-background px-4 text-sm"
          >
            {statusOrder.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Удалить заявку?")) {
                  onDelete();
                }
              }}
              disabled={saving}
              className="h-10 rounded-full border border-destructive px-4 text-sm text-destructive hover:bg-destructive/10"
            >
              Удалить
            </button>
          )}
        </div>
      </div>

      <ul className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
        {order.order_items.map((item) => (
          <li key={item.id} className="flex justify-between">
            <span>
              {item.title} × {item.quantity}
            </span>
            <span className="text-muted-foreground">{formatPrice(item.price * item.quantity)}</span>
          </li>
        ))}
      </ul>

      {(order.card_text || order.comment) && (
        <div className="mt-4 space-y-1 text-sm text-muted-foreground">
          {order.card_text && <p>Открытка: {order.card_text}</p>}
          {order.comment && <p>Комментарий: {order.comment}</p>}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="min-w-52 flex-1 text-sm">
          <span className="mb-1.5 block text-muted-foreground">Заметка сотрудника</span>
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="h-11 w-full rounded-2xl border border-border bg-background px-4"
          />
        </label>
        <button
          type="button"
          disabled={saving}
          onClick={() => onSave({ admin_note: note })}
          className="h-11 rounded-full border border-border px-6 text-sm disabled:opacity-60"
        >
          Сохранить заметку
        </button>
      </div>
    </li>
  );
}
