import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

/** Заметное уведомление: данные защищены и не передаются ИИ. */
export function PrivacyNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-3 text-xs text-foreground">
      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
      <div className="space-y-1">
        <p className="font-medium">Ваши данные защищены</p>
        <p className="text-muted-foreground">
          Имя, телефон и адрес хранятся в зашифрованном виде.{" "}
          <span className="font-medium text-foreground">Мы не передаём их ИИ</span>
          {compact ? "" : " — консультант их не видит"}: они нужны только для оформления заявки.{" "}
          <Link to="/privacy" className="text-primary underline">
            Подробнее
          </Link>
        </p>
      </div>
    </div>
  );
}
