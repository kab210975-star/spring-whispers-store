import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { AdminShell, NoAccess } from "@/components/site/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { deleteProduct, getMyAccess, listAllProducts, saveProduct } from "@/lib/admin.functions";
import { productImage } from "@/lib/product-images";
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
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<ProductKind | "all">("all");
  const [stockFilter, setStockFilter] = useState<"all" | "in" | "out">("all");

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

  const all = (products.data ?? []) as Product[];
  const q = search.trim().toLowerCase();
  const list = all.filter(
    (p) =>
      (kindFilter === "all" || p.kind === kindFilter) &&
      (stockFilter === "all" || (stockFilter === "in" ? p.in_stock : !p.in_stock)) &&
      (!q || p.title.toLowerCase().includes(q)),
  );
  const chip = (active: boolean) =>
    `h-9 rounded-full px-4 text-sm ${active ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`;

  return (
    <AdminShell role={access.data?.role ?? null}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Товары</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Всего позиций: {all.length}, показано: {list.length}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDraft({ ...emptyDraft })}
          className="h-11 rounded-full bg-primary px-6 text-sm text-primary-foreground"
        >
          Добавить товар
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по названию"
          className="h-9 w-56 rounded-full border border-border bg-background px-4 text-sm"
        />
        {(["all", "bouquet", "single", "gift"] as const).map((k) => (
          <button key={k} type="button" onClick={() => setKindFilter(k)} className={chip(kindFilter === k)}>
            {k === "all" ? "Все типы" : kindLabels[k]}
          </button>
        ))}
        {(["all", "in", "out"] as const).map((s) => (
          <button key={s} type="button" onClick={() => setStockFilter(s)} className={chip(stockFilter === s)}>
            {s === "all" ? "Любое наличие" : s === "in" ? "В наличии" : "Нет в наличии"}
          </button>
        ))}
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
                    <div className="flex items-center gap-3">
                      <img
                        src={productImage(product)}
                        alt=""
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                      <div>
                        <p className="font-medium">{product.title}</p>
                        <p className="text-xs text-muted-foreground">{product.slug}</p>
                      </div>
                    </div>
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

function PhotoUploader({
  slug,
  value,
  onChange,
}: {
  slug: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const preview = value || productImage({ slug, image_url: null });

  async function upload(file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Нужен файл JPG, PNG или WebP");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Фото больше 5 МБ");
      return;
    }
    setBusy(true);
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${slug || "tovar"}-${Date.now().toString(36)}.${ext}`;
    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, file, { contentType: file.type, upsert: false });
    setBusy(false);
    if (error) {
      toast.error("Не удалось загрузить фото", { description: error.message });
      return;
    }
    onChange(`/api/public/product-image/${path}`);
    toast.success("Фото загружено — не забудьте сохранить товар");
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        upload(e.dataTransfer.files[0]);
      }}
      className={`flex flex-wrap items-center gap-5 rounded-2xl border-2 border-dashed p-4 ${
        over ? "border-primary bg-accent" : "border-border"
      }`}
    >
      <img src={preview} alt="Фото товара" className="h-28 w-28 rounded-xl object-cover" />
      <div className="flex flex-col gap-2">
        <p className="text-muted-foreground">
          {value ? "Своё фото загружено" : "Сейчас стандартное фото"}. Перетащите файл сюда или выберите.
        </p>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex h-10 cursor-pointer items-center rounded-full bg-primary px-5 text-primary-foreground">
            {busy ? "Загружаем…" : value ? "Заменить фото" : "Выбрать фото"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                upload(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="h-10 rounded-full border border-border px-5"
            >
              Убрать фото
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">JPG, PNG или WebP, до 5 МБ</p>
      </div>
    </div>
  );
}
