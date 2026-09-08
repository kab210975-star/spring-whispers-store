export const site = {
  name: "Тюльпановый сад",
  tagline: "Тюльпаны с доставкой по Москве",
  phone: "+7 (495) 000-00-00",
  phoneHref: "tel:+74950000000",
  email: "hello@tulpanovy-sad.ru",
  address: "Москва, ул. Цветочная, 12",
  hours: "Ежедневно, 8:00 – 21:00",
  deliveryZone: "Москва и до 20 км за МКАД",
  freeDeliveryFrom: 5000,
  deliveryPrice: 490,
  legalName: "ИП Иванова Мария Сергеевна",
  inn: "770000000000",
  ogr: "300000000000000",
};

export const deliverySlots = [
  "10:00 – 13:00",
  "13:00 – 16:00",
  "16:00 – 19:00",
  "19:00 – 21:00",
];

export const kindLabels: Record<string, string> = {
  bouquet: "Букеты",
  single: "Поштучно",
  gift: "Подарки",
};

export const statusLabels: Record<string, string> = {
  new: "Новая",
  in_progress: "В работе",
  delivered: "Доставлена",
  cancelled: "Отменена",
};

export function formatPrice(value: number | string): string {
  const num = typeof value === "string" ? Number(value) : value;
  return `${new Intl.NumberFormat("ru-RU").format(Math.round(num))} ₽`;
}

export function deliveryCost(subtotal: number): number {
  return subtotal >= site.freeDeliveryFrom ? 0 : site.deliveryPrice;
}
