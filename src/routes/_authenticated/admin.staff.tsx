import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { AdminShell, NoAccess } from "@/components/site/AdminShell";
import { getMyAccess, listStaff, setAdminRole } from "@/lib/admin.functions";

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

type StaffRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  isAdmin: boolean;
};

function AdminStaffPage() {
  const fetchAccess = useServerFn(getMyAccess);
  const fetchStaff = useServerFn(listStaff);
  const changeRole = useServerFn(setAdminRole);
  const queryClient = useQueryClient();

  const access = useQuery({ queryKey: ["admin", "access"], queryFn: () => fetchAccess() });
  const isAdmin = access.data?.role === "admin";
  const staff = useQuery({
    queryKey: ["admin", "staff"],
    queryFn: () => fetchStaff(),
    enabled: isAdmin,
  });

  const mutation = useMutation({
    mutationFn: (input: { user_id: string; admin: boolean }) => changeRole({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "staff"] });
      toast.success("Права обновлены");
    },
    onError: (error: Error) => toast.error("Не удалось изменить права", { description: error.message }),
  });

  if (access.isLoading) {
    return (
      <AdminShell>
        <p className="text-muted-foreground">Загружаем…</p>
      </AdminShell>
    );
  }

  if (!access.data?.isAdmin) {
    return (
      <AdminShell>
        <NoAccess />
      </AdminShell>
    );
  }

  const list = (staff.data ?? []) as StaffRow[];

  return (
    <AdminShell>
      <h1 className="font-display text-3xl">Сотрудники</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Сотрудник появляется в списке после первого входа. Полный доступ к заявкам и товарам есть только
        у администраторов.
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
                <th className="px-5 py-4">Доступ</th>
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
                    <button
                      type="button"
                      disabled={mutation.isPending}
                      onClick={() => mutation.mutate({ user_id: person.id, admin: !person.isAdmin })}
                      className={`h-9 rounded-full px-4 text-xs ${
                        person.isAdmin
                          ? "bg-primary text-primary-foreground"
                          : "border border-border text-muted-foreground"
                      }`}
                    >
                      {person.isAdmin ? "администратор" : "нет доступа"}
                    </button>
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
