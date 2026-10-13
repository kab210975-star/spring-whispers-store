/** Подставляет реальные данные в метки {{имя}}, {{телефон}}, {{адрес}} после генерации ИИ. */
export function fillPII(text: string, pii: { name?: string | null; phone?: string | null; address?: string | null }) {
  return text
    .replace(/\{\{\s*имя\s*\}\}/gi, pii.name ?? "")
    .replace(/\{\{\s*телефон\s*\}\}/gi, pii.phone ?? "")
    .replace(/\{\{\s*адрес\s*\}\}/gi, pii.address ?? "указанный вами адрес");
}

