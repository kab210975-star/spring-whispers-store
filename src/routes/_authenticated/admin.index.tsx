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
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<OrderStatus | "all">("all");

  const access = useQuery({ queryKey: ["admin", "access"], queryFn: () => fetchAccess() });
  const canManage = access.data?.role === "admin" || access.data?.role === "staff";
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

  const list = ((orders.data ?? []) as Order[]).filter(
    (order) => filter === "all" || order.status === filter,
  );

  return (
    <AdminShell role={access.data?.role ?? null}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Заявки</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Всего: {(orders.data ?? []).length}. Новых:{" "}
            {((orders.data ?? []) as Order[]).filter((o) => o.status === "new").length}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", ...statusOrder] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`h-9 rounded-full px-4 text-sm ${
                filter === value
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground"
              }`}
            >
              {value === "all" ? "Все" : statusLabels[value]}
            </button>
          ))}
        </div>
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
              onSave={(input) => mutation.mutate({ id: order.id, ...input })}
              saving={mutation.isPending}
            />
          ))}
        </ul>
      )}
    </AdminShell>
  );
}

function OrderCard({
  order,
  onSave,
  saving,
}: {
  order: Order;
  onSave: (input: { status?: OrderStatus; admin_note?: string }) => void;
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
