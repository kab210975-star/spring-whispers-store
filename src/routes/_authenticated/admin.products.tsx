import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { AdminShell, NoAccess } from "@/components/site/AdminShell";
import { deleteProduct, getMyAccess, listAllProducts, saveProduct } from "@/lib/admin.functions";
import { formatPrice, kindLabels } from "@/lib/site";
import { slugify } from "@/lib/slug";
import type { Product, ProductKind } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/admin/products")({
  head: () => ({
    meta: [
      { title: "Товары магазина | Панель Тюльпановый сад" },
      { name: "description", content: "Добавление и редактирование букетов, тюльпанов и подарков." },
      { property: "og:title", content: "Товары магазина | Панель" },
      { property: "og:description", content: "Управление каталогом тюльпанов." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminProductsPage,
});

type Draft = {
  id: string | null;
  slug: string;
  title: string;
  kind: ProductKind;
  price: number;
  color: string;
  composition: string;
  description: string;
  care_tip: string;
  image_url: string;
  in_stock: boolean;
  is_visible: boolean;
  sort_order: number;
};

const emptyDraft: Draft = {
  id: null,
  slug: "",
  title: "",
  kind: "bouquet",
  price: 2500,
  color: "",
  composition: "",
  description: "",
  care_tip: "",
  image_url: "",
  in_stock: true,
  is_visible: true,
  sort_order: 100,
};

function toDraft(product: Product): Draft {
  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    kind: product.kind,
    price: product.price,
    color: product.color ?? "",
    composition: product.composition ?? "",
    description: product.description ?? "",
    care_tip: product.care_tip ?? "",
    image_url: product.image_url ?? "",
    in_stock: product.in_stock,
    is_visible: product.is_visible,
    sort_order: product.sort_order,
  };
}

function AdminProductsPage() {
  const fetchAccess = useServerFn(getMyAccess);
  const fetchProducts = useServerFn(listAllProducts);
  const persist = useServerFn(saveProduct);
  const remove = useServerFn(deleteProduct);
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);

  const access = useQuery({ queryKey: ["admin", "access"], queryFn: () => fetchAccess() });
  const canManage = access.data?.role === "admin" || access.data?.role === "staff";
  const products = useQuery({
    queryKey: ["admin", "products"],
    queryFn: () => fetchProducts(),
    enabled: canManage,
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
  }

  const save = useMutation({
    mutationFn: (value: Draft) => persist({ data: value }),
    onSuccess: () => {
      refresh();
      setDraft(null);
      toast.success("Товар сохранён");
    },
    onError: (error: Error) => toast.error("Не удалось сохранить", { description: error.message }),
  });

  const drop = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      refresh();
      toast.success("Товар удалён");
    },
    onError: () => toast.error("Не удалось удалить товар"),
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
      <AdminShell role={access.data?.role ?? null}>
        <NoAccess />
      </AdminShell>
    );
  }

  const list = (products.data ?? []) as Product[];

  return (
    <AdminShell role={access.data?.role ?? null}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Товары</h1>
          <p className="mt-1 text-sm text-muted-foreground">Всего позиций: {list.length}</p>
        </div>
        <button
          type="button"
          onClick={() => setDraft({ ...emptyDraft })}
          className="h-11 rounded-full bg-primary px-6 text-sm text-primary-foreground"
        >
          Добавить товар
        </button>
      </div>

      {draft && (
        <ProductForm
          draft={draft}
          onChange={setDraft}
          onCancel={() => setDraft(null)}
          onSubmit={() => save.mutate(draft)}
          saving={save.isPending}
        />
      )}

      {products.isLoading ? (
        <p className="mt-10 text-muted-foreground">Загружаем каталог…</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-3xl bg-card">
          <table className="w-full min-w-3xl text-sm">
            <thead className="border-b border-border text-left text-muted-foreground">
              <tr>
                <th className="px-5 py-4">Название</th>
                <th className="px-5 py-4">Тип</th>
                <th className="px-5 py-4">Цена</th>
                <th className="px-5 py-4">Наличие</th>
                <th className="px-5 py-4">На сайте</th>
                <th className="px-5 py-4" />
              </tr>
            </thead>
            <tbody>
              {list.map((product) => (
                <tr key={product.id} className="border-b border-border/60 last:border-0">
                  <td className="px-5 py-4">
                    <p className="font-medium">{product.title}</p>
                    <p className="text-xs text-muted-foreground">{product.slug}</p>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{kindLabels[product.kind]}</td>
                  <td className="px-5 py-4">{formatPrice(product.price)}</td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => save.mutate({ ...toDraft(product), in_stock: !product.in_stock })}
                      className="rounded-full border border-border px-3 py-1 text-xs"
                    >
                      {product.in_stock ? "есть" : "нет"}
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() =>
                        save.mutate({ ...toDraft(product), is_visible: !product.is_visible })
                      }
                      className="rounded-full border border-border px-3 py-1 text-xs"
                    >
                      {product.is_visible ? "виден" : "скрыт"}
                    </button>
                  </td>
                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setDraft(toDraft(product))}
                      className="text-primary hover:underline"
                    >
                      Изменить
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Удалить «${product.title}»?`)) drop.mutate(product.id);
                      }}
                      className="ml-4 text-muted-foreground hover:text-destructive"
                    >
                      Удалить
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

function ProductForm({
  draft,
  onChange,
  onCancel,
  onSubmit,
  saving,
}: {
  draft: Draft;
  onChange: (value: Draft) => void;
  onCancel: () => void;
  onSubmit: () => void;
  saving: boolean;
}) {
  const field = "h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm";

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="mt-8 rounded-3xl bg-card p-6"
    >
      <h2 className="font-display text-2xl">{draft.id ? "Редактирование" : "Новый товар"}</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1.5 block text-muted-foreground">Название</span>
          <input
            required
            value={draft.title}
            onChange={(e) =>
              onChange({
                ...draft,
                title: e.target.value,
                slug: draft.id ? draft.slug : slugify(e.target.value),
              })
            }
            className={field}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1.5 block text-muted-foreground">
            Адрес страницы — заполняется автоматически, можно изменить
          </span>
          <input
            value={draft.slug}
            onChange={(e) => onChange({ ...draft, slug: e.target.value })}
            placeholder="pervyy-sneg"
            className={field}
          />
        </label>

        <label className="text-sm">
          <span className="mb-1.5 block text-muted-foreground">Тип</span>
          <select
            value={draft.kind}
            onChange={(e) => onChange({ ...draft, kind: e.target.value as ProductKind })}
            className={field}
          >
            <option value="bouquet">Букет</option>
            <option value="single">Поштучно</option>
            <option value="gift">Подарок</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1.5 block text-muted-foreground">Цена, ₽</span>
          <input
            required
            type="number"
            min={0}
            value={draft.price}
            onChange={(e) => onChange({ ...draft, price: Number(e.target.value) })}
            className={field}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1.5 block text-muted-foreground">Цвет</span>
          <input
            value={draft.color}
            onChange={(e) => onChange({ ...draft, color: e.target.value })}
            className={field}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1.5 block text-muted-foreground">Порядок показа</span>
          <input
            type="number"
            min={0}
            value={draft.sort_order}
            onChange={(e) => onChange({ ...draft, sort_order: Number(e.target.value) })}
            className={field}
          />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1.5 block text-muted-foreground">Состав</span>
          <input
            value={draft.composition}
            onChange={(e) => onChange({ ...draft, composition: e.target.value })}
            className={field}
          />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1.5 block text-muted-foreground">Описание</span>
          <textarea
            rows={3}
            value={draft.description}
            onChange={(e) => onChange({ ...draft, description: e.target.value })}
            className="w-full rounded-2xl border border-border bg-background p-4 text-sm"
          />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1.5 block text-muted-foreground">Совет по уходу</span>
          <input
            value={draft.care_tip}
            onChange={(e) => onChange({ ...draft, care_tip: e.target.value })}
            className={field}
          />
        </label>
        <div className="text-sm sm:col-span-2">
          <span className="mb-1.5 block text-muted-foreground">Фото товара</span>
          <PhotoUploader
            slug={draft.slug}
            value={draft.image_url}
            onChange={(url) => onChange({ ...draft, image_url: url })}
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-6 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.in_stock}
            onChange={(e) => onChange({ ...draft, in_stock: e.target.checked })}
          />
          В наличии
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.is_visible}
            onChange={(e) => onChange({ ...draft, is_visible: e.target.checked })}
          />
          Показывать на сайте
        </label>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className="h-11 rounded-full bg-primary px-7 text-sm text-primary-foreground disabled:opacity-60"
        >
          Сохранить
        </button>
        <button type="button" onClick={onCancel} className="h-11 rounded-full border border-border px-7 text-sm">
          Отмена
        </button>
      </div>
    </form>
  );
}
