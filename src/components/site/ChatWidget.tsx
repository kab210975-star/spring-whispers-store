import { useChat } from "@ai-sdk/react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Headset, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import tulipBot from "@/assets/tulip-bot.png";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  callOperator,
  getChatHistory,
  getChatUpdates,
  sendVisitorMessage,
  startChat,
} from "@/lib/chat.functions";

const TOKEN_KEY = "tulip-garden-chat-token";

type Status = "ai" | "operator" | "closed";
type Row = { id: string; role: string; content: string; created_at: string };

function rowToMessage(r: Row): UIMessage {
  return {
    id: r.id,
    role: r.role === "user" ? "user" : "assistant",
    metadata: r.role === "operator" ? { operator: true } : undefined,
    parts: [{ type: "text", text: r.content }],
  };
}

export function ChatWidget() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<{ status: Status; messages: UIMessage[]; lastAt: string } | null>(null);
  const history = useServerFn(getChatHistory);

  useEffect(() => {
    setToken(window.localStorage.getItem(TOKEN_KEY));
  }, []);

  useEffect(() => {
    if (!open || !token || loaded) return;
    history({ data: { token } })
      .then((res) => {
        const rows = res.messages as Row[];
        setLoaded({
          status: res.status as Status,
          messages: rows.map(rowToMessage),
          lastAt: rows.at(-1)?.created_at ?? new Date(0).toISOString(),
        });
      })
      .catch(() => {
        window.localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      });
  }, [open, token, loaded, history]);

  if (pathname.startsWith("/admin") || pathname.startsWith("/auth")) return null;

  return (
    <>
      {open && (
        <div className="fixed inset-x-3 bottom-24 z-50 flex h-[min(620px,calc(100vh-8rem))] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl sm:inset-x-auto sm:right-5 sm:w-[400px]">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <img src={tulipBot} alt="" width={40} height={40} className="h-10 w-10 rounded-full bg-secondary p-1" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-base leading-tight">Флорист-консультант</p>
              <p className="text-xs text-muted-foreground">
                {loaded?.status === "operator" ? "Подключается оператор" : "Поможет выбрать букет"}
              </p>
            </div>
            <button
              type="button"
              aria-label="Закрыть чат"
              onClick={() => setOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {!token ? (
            <StartForm
              onStarted={(t) => {
                window.localStorage.setItem(TOKEN_KEY, t);
                setLoaded({ status: "ai", messages: [], lastAt: new Date().toISOString() });
                setToken(t);
              }}
            />
          ) : loaded ? (
            <ChatWindow key={token} token={token} initial={loaded} />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <Shimmer>Загружаю переписку…</Shimmer>
            </div>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Закрыть чат" : "Открыть чат с флористом"}
        className="fixed bottom-5 right-5 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <img src={tulipBot} alt="" width={44} height={44} className="h-11 w-11 rounded-full bg-primary-foreground p-1" />
        )}
      </button>
    </>
  );
}

function StartForm({ onStarted }: { onStarted: (token: string) => void }) {
  const start = useServerFn(startChat);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [privacy, setPrivacy] = useState(false);
  const [pd, setPd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = name.trim().length >= 2 && phone.replace(/\D/g, "").length >= 6 && privacy && pd;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      const res = await start({ data: { name: name.trim(), phone: phone.trim(), privacy: true, pd: true } });
      onStarted(res.token);
    } catch {
      setError("Не удалось начать чат. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
      <p className="text-sm text-muted-foreground">
        Здравствуйте! Подскажу букет под повод и бюджет, соберу свой из тюльпанов и оформлю заявку. Представьтесь, пожалуйста.
      </p>
      <label className="text-sm">
        Имя
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5"
          autoComplete="name"
          required
        />
      </label>
      <label className="text-sm">
        Телефон
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5"
          type="tel"
          autoComplete="tel"
          placeholder="+7 ___ ___-__-__"
          required
        />
      </label>
      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} className="mt-0.5" />
        <span>
          Я согласен(на) с{" "}
          <Link to="/privacy" className="text-primary underline">
            политикой конфиденциальности
          </Link>
        </span>
      </label>
      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={pd} onChange={(e) => setPd(e.target.checked)} className="mt-0.5" />
        <span>Я даю согласие на обработку персональных данных</span>
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        type="submit"
        disabled={!valid || busy}
        className="mt-auto rounded-full bg-primary px-5 py-3 text-sm text-primary-foreground disabled:opacity-50"
      >
        {busy ? "Подключаю…" : "Начать чат"}
      </button>
    </form>
  );
}

function ChatWindow({
  token,
  initial,
}: {
  token: string;
  initial: { status: Status; messages: UIMessage[]; lastAt: string };
}) {
  const [status, setStatus] = useState<Status>(initial.status);
  const [error, setError] = useState<string | null>(null);
  const lastAt = useRef(initial.lastAt);
  const updates = useServerFn(getChatUpdates);
  const sendManual = useServerFn(sendVisitorMessage);
  const operatorFn = useServerFn(callOperator);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages }) => ({ body: { token, message: messages.at(-1) } }),
      }),
    [token],
  );

  const { messages, sendMessage, setMessages, status: chatStatus } = useChat({
    id: token,
    messages: initial.messages,
    transport,
    onError: (e) => setError(e.message || "Консультант не смог ответить"),
  });

  const busy = chatStatus === "submitted" || chatStatus === "streaming";

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await updates({ data: { token, after: lastAt.current } });
        setStatus(res.status as Status);
        const rows = res.messages as Row[];
        if (rows.length) {
          lastAt.current = rows.at(-1)!.created_at;
          setMessages((prev) => {
            const known = new Set(prev.map((m) => m.id));
            return [...prev, ...rows.filter((r) => !known.has(r.id)).map(rowToMessage)];
          });
        }
      } catch {
        /* тихо пробуем снова */
      }
    }, 5000);
    return () => clearInterval(id);
  }, [token, updates, setMessages]);

  async function handleSubmit({ text }: { text: string }) {
    const value = text.trim();
    if (!value || busy) return;
    setError(null);
    if (status === "ai") {
      await sendMessage({ text: value });
      return;
    }
    setMessages((prev) => [
      ...prev,
      { id: `local-${Date.now()}`, role: "user", parts: [{ type: "text", text: value }] },
    ]);
    try {
      await sendManual({ data: { token, text: value } });
    } catch {
      setError("Сообщение не отправлено");
    }
  }

  async function askOperator() {
    await operatorFn({ data: { token } });
    setStatus("operator");
  }

  return (
    <>
      <Conversation className="flex-1">
        <ConversationContent className="gap-5 px-4">
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<img src={tulipBot} alt="" width={56} height={56} className="h-14 w-14" />}
              title="Чем помочь?"
              description="Например: «букет маме до 3000 ₽» или «соберите 15 розовых тюльпанов»"
            />
          ) : (
            messages.map((m) => {
              const isOperator = (m.metadata as { operator?: boolean } | undefined)?.operator;
              const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
              const toolWorking = m.parts.some(
                (p) => p.type.startsWith("tool-") && "state" in p && p.state !== "output-available",
              );
              return (
                <Message key={m.id} from={m.role}>
                  {isOperator && <span className="text-xs text-primary">Оператор</span>}
                  <MessageContent className="group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground group-[.is-user]:rounded-2xl">
                    {text && <MessageResponse>{text}</MessageResponse>}
                    {!text && toolWorking && <Shimmer>Сверяюсь с каталогом…</Shimmer>}
                  </MessageContent>
                </Message>
              );
            })
          )}
          {chatStatus === "submitted" && <Shimmer>Думаю…</Shimmer>}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="border-t border-border p-3">
        {status === "operator" && (
          <p className="mb-2 text-xs text-muted-foreground">
            Чат передан оператору — он ответит здесь в ближайшее время.
          </p>
        )}
        {status === "closed" && (
          <p className="mb-2 text-xs text-muted-foreground">Обращение закрыто. Можете написать снова.</p>
        )}
        {error && <p className="mb-2 text-xs text-destructive">{error}</p>}
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputTextarea placeholder="Напишите сообщение…" autoFocus />
          <PromptInputFooter className="justify-between">
            {status === "ai" ? (
              <button
                type="button"
                onClick={askOperator}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
              >
                <Headset className="h-3.5 w-3.5" /> Позвать оператора
              </button>
            ) : (
              <span />
            )}
            <PromptInputSubmit status={chatStatus} disabled={busy} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </>
  );
}
