/**
 * Шифрование персональных данных (152-ФЗ).
 * AES-256-GCM через Web Crypto, ключ — только в секрете сервера PII_ENCRYPTION_KEY.
 * Формат: v1:<iv base64>:<ciphertext base64>. Номер версии позволяет сменить ключ.
 */
export { fillPII } from "./pii-fill";
export const PII_PLACEHOLDER = "•••";
const VERSION = "v1";

const keyCache = new Map<string, Promise<CryptoKey>>();
function aesKey(version: string) {
  const envName = version === "v1" ? "PII_ENCRYPTION_KEY" : `PII_ENCRYPTION_KEY_${version.toUpperCase()}`;
  const raw = process.env[envName];
  if (!raw) throw new Error("PII encryption key is not configured");
  let p = keyCache.get(envName);
  if (!p) {
    p = crypto.subtle
      .digest("SHA-256", new TextEncoder().encode(raw))
      .then((bytes) => crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]));
    keyCache.set(envName, p);
  }
  return p;
}

const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function encryptPII(value: string | null | undefined): Promise<string | null> {
  if (value == null || value === "") return null;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(VERSION), new TextEncoder().encode(value));
  return `${VERSION}:${b64(iv)}:${b64(new Uint8Array(ct))}`;
}

export async function decryptPII(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  const [version, iv, ct] = value.split(":");
  if (!version || !iv || !ct) return null;
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv) }, await aesKey(version), unb64(ct));
    return new TextDecoder().decode(plain);
  } catch {
    console.error("[pii] не удалось расшифровать значение (подмена или неверный ключ)");
    return null;
  }
}

export async function hashPhone(phone: string): Promise<string> {
  const salt = process.env["PII_HASH_SALT"];
  if (!salt) throw new Error("PII hash salt is not configured");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(salt), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(phone.replace(/\D/g, "")));
  return b64(new Uint8Array(sig));
}

/** Поля для вставки/обновления: открытые колонки получают заглушку, данные — в *_enc. */
export async function encryptedPersonFields(p: {
  customer_name: string;
  phone: string;
  address?: string | null;
}) {
  return {
    customer_name: PII_PLACEHOLDER,
    phone: PII_PLACEHOLDER,
    customer_name_enc: await encryptPII(p.customer_name),
    phone_enc: await encryptPII(p.phone),
    phone_hash: await hashPhone(p.phone),
    ...(p.address !== undefined ? { address_enc: await encryptPII(p.address) } : {}),
  };
}

export async function encryptedOrderFields(p: {
  customer_name: string;
  phone: string;
  address: string | null;
  card_text: string | null;
}) {
  return {
    ...(await encryptedPersonFields(p)),
    address: null,
    card_text: null,
    card_text_enc: await encryptPII(p.card_text),
  };
}

type EncRow = {
  customer_name: string;
  phone: string;
  customer_name_enc?: string | null;
  phone_enc?: string | null;
  address?: string | null;
  address_enc?: string | null;
  card_text?: string | null;
  card_text_enc?: string | null;
};

/** Расшифровывает строку; для старых записей без шифра возвращает открытые значения. */
export async function decryptRow<T extends EncRow>(row: T) {
  const { customer_name_enc, phone_enc, address_enc, card_text_enc, ...rest } = row;
  const out = { ...rest } as Omit<T, "customer_name_enc" | "phone_enc" | "address_enc" | "card_text_enc">;
  const o = out as unknown as EncRow;
  if (customer_name_enc) o.customer_name = (await decryptPII(customer_name_enc)) ?? PII_PLACEHOLDER;
  if (phone_enc) o.phone = (await decryptPII(phone_enc)) ?? PII_PLACEHOLDER;
  if (address_enc !== undefined && address_enc) o.address = await decryptPII(address_enc);
  if (card_text_enc !== undefined && card_text_enc) o.card_text = await decryptPII(card_text_enc);
  return out;
}

/* ---------- Скрытие ПДн от ИИ ---------- */

const PHONE_RE = /(?<!\d)(?:(?:\+7|8)[\s\-(]*)?\d{3}[\s\-)]*\d{3}[\s\-]*\d{2}[\s\-]*\d{2}(?!\d)/g;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const STREET = String.raw`(?:ул\.?|улица|проспект|пр-т|просп\.|пер\.|переулок|шоссе|ш\.|бульвар|б-р|наб\.|набережная|площадь|пл\.|проезд|мкр\.?|микрорайон)`;
const PARTS = String.raw`(?:,?\s*(?:д\.|дом|кв\.?|квартира|корп\.|корпус|к\.|стр\.|строение|подъезд|под\.|этаж|эт\.)?\s*\d+[а-яa-z]?(?:\/\d+)?)+`;
const ADDRESS_RE = new RegExp(
  String.raw`(?:(?:г\.?\s*)?москва,?\s*)?(?:[А-ЯЁ][а-яё\-]+\s+${STREET}|${STREET}\s+[А-ЯЁа-яё\-]+(?:\s+[А-ЯЁ][а-яё\-]+)?)${PARTS}?`,
  "giu",
);
const HOUSE_RE = /(?:д\.|дом)\s*\d+[а-я]?(?:,?\s*(?:кв\.|квартира|корп\.|подъезд)\s*\d+)*/giu;

export type Redaction = { text: string; address: string | null };

/** Заменяет телефоны, email, адреса и имя покупателя на метки. */
export function redactPII(text: string, name?: string | null): Redaction {
  let address: string | null = null;
  let out = text.replace(EMAIL_RE, "[email]");
  out = out.replace(PHONE_RE, (m) => (m.replace(/\D/g, "").length >= 10 ? "[телефон]" : m));
  out = out.replace(ADDRESS_RE, (m) => {
    address = m.trim();
    return "[адрес]";
  });
  out = out.replace(HOUSE_RE, (m) => {
    address ??= m.trim();
    return "[адрес]";
  });
  if (name) {
    for (const part of name.split(/\s+/).filter((w) => w.length >= 2)) {
      out = out.replace(new RegExp(`(^|[^\\p{L}])${part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=$|[^\\p{L}])`, "giu"), "$1[имя]");
    }
  }
  return { text: out, address };
}

/** Запись в журнал доступа к ПДн (от имени сотрудника, RLS проверяет роль). */
export async function logPIIAccess(supabase: any, userId: string, entity: string, entityId: string | null) {
  const { error } = await supabase.from("pii_access_log").insert({ user_id: userId, entity, entity_id: entityId });
  if (error) console.error("[pii] журнал доступа не записан");
}
