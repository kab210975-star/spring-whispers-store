import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { AdminShell, NoAccess } from "@/components/site/AdminShell";
import { deleteStaffAccount, getMyAccess, listStaff, setStaffRole } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/staff")({
  head: () => ({
    meta: [
      { title: "Сотрудники | Панель Тюльпановый сад" },
      { name: "description", content: "Список сотрудников магазина и права доступа к панели." },
      { property: "og:title", content: "Сотрудники | Панель" },
      { property: "og:description", content: "Права доступа сотрудников магазина тюльпанов." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminStaffPage,
});

type StaffRole = "admin" | "staff" | null;

type StaffRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  role: StaffRole;
};

const roleLabels: Record<"admin" | "staff", string> = {
  admin: "администратор",
  staff: "сотрудник",
};

function AdminStaffPage() {
  const fetchAccess = useServerFn(getMyAccess);
  const fetchStaff = useServerFn(listStaff);
  const changeRole = useServerFn(setStaffRole);
  const remove = useServerFn(deleteStaffAccount);
  const queryClient = useQueryClient();

  const access = useQuery({ queryKey: ["admin", "access"], queryFn: () => fetchAccess() });
  const isAdmin = access.data?.role === "admin";
  const staff = useQuery({
    queryKey: ["admin", "staff"],
    queryFn: () => fetchStaff(),
    enabled: isAdmin,
  });

  const mutation = useMutation({
    mutationFn: (input: { user_id: string; role: StaffRole }) => changeRole({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "staff"] });
      toast.success("Права обновлены");
    },
    onError: (error: Error) => toast.error("Не удалось изменить права", { description: error.message }),
  });


  const deleteMutation = useMutation({
    mutationFn: (input: { user_id: string }) => remove({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "staff"] });
      toast.success("Аккаунт удалён");
    },
    onError: (error: Error) => toast.error("Не удалось удалить аккаунт", { description: error.message }),
  });

  if (access.isLoading) {
    return (
      <AdminShell>
        <p className="text-muted-foreground">Загружаем…</p>
      </AdminShell>
    );
  }

  if (!isAdmin) {
    return (
      <AdminShell role={access.data?.role ?? null}>
        <NoAccess />
      </AdminShell>
    );
  }

  const list = (staff.data ?? []) as StaffRow[];

  return (
    <AdminShell role={access.data?.role ?? null}>
      <h1 className="font-display text-3xl">Сотрудники</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Сотрудник появляется в списке после первого входа. Управление правами и удаление заявок доступны
        только администраторам.
      </p>

      {staff.isLoading ? (
        <p className="mt-10 text-muted-foreground">Загружаем список…</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-3xl bg-card">
          <table className="w-full min-w-2xl text-sm">
            <thead className="border-b border-border text-left text-muted-foreground">
              <tr>
                <th className="px-5 py-4">Сотрудник</th>
                <th className="px-5 py-4">Почта</th>
                <th className="px-5 py-4">Добавлен</th>
                <th className="px-5 py-4">Роль</th>
                <th className="px-5 py-4">Действия</th>
              </tr>
            </thead>
            <tbody>
              {list.map((person) => (
                <tr key={person.id} className="border-b border-border/60 last:border-0">
                  <td className="px-5 py-4">{person.full_name || "без имени"}</td>
                  <td className="px-5 py-4 text-muted-foreground">{person.email ?? "—"}</td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {new Date(person.created_at).toLocaleDateString("ru-RU")}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex h-8 items-center rounded-full px-4 text-xs ${
                        person.role === "admin"
                          ? "bg-primary text-primary-foreground"
                          : person.role === "staff"
                            ? "border border-primary/40 text-primary"
                            : "border border-border text-muted-foreground"
                      }`}
                    >
                      {person.role ? roleLabels[person.role] : "нет доступа"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-3">
                      {person.role === null && (
                        <button
                          type="button"
                          disabled={mutation.isPending}
                          onClick={() => mutation.mutate({ user_id: person.id, role: "staff" })}
                          className="h-9 rounded-full border border-border px-4 text-xs hover:bg-accent disabled:opacity-50"
                        >
                          Дать доступ сотрудника
                        </button>
                      )}
                      {person.role === "staff" && (
                        <button
                          type="button"
                          disabled={mutation.isPending}
                          onClick={() => {
                            if (confirm(`Сделать ${person.email ?? "сотрудника"} администратором?`)) {
                              mutation.mutate({ user_id: person.id, role: "admin" });
                            }
                          }}
                          className="h-9 rounded-full border border-border px-4 text-xs hover:bg-accent disabled:opacity-50"
                        >
                          Сделать администратором
                        </button>
                      )}
                      {person.role === "admin" && person.id !== access.data?.profile?.id && (
                        <button
                          type="button"
                          disabled={mutation.isPending}
                          onClick={() => {
                            if (confirm(`Снять права администратора у ${person.email ?? "сотрудника"}?`)) {
                              mutation.mutate({ user_id: person.id, role: "staff" });
                            }
                          }}
                          className="h-9 rounded-full border border-border px-4 text-xs hover:bg-accent disabled:opacity-50"
                        >
                          Снять права администратора
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={deleteMutation.isPending || person.id === access.data?.profile?.id}
                        onClick={() => {
                          if (confirm(`Удалить аккаунт ${person.email ?? person.full_name ?? "сотрудника"}?`)) {
                            deleteMutation.mutate({ user_id: person.id });
                          }
                        }}
                        className="h-9 rounded-full border border-border px-4 text-xs text-muted-foreground hover:bg-accent disabled:opacity-50"
                        title="Нельзя удалить свой аккаунт"
                      >
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
