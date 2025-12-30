"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type AssistantLink = { label: string; href: string };
type ContextCard = {
  title: string;
  lines: string[];
  href?: string;
  status?: "success" | "warning" | "error" | "info";
};
type AssistantAction = {
  type: "link" | "copy";
  label: string;
  href?: string;
  text?: string;
};
type AssistantDraft = {
  id: string;
  title: string;
  text: string;
};
type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  links?: AssistantLink[];
  contextCards?: ContextCard[];
  actions?: AssistantAction[];
  drafts?: AssistantDraft[];
};

type AssistantWidgetProps = {
  variant?: "public" | "admin";
};

const quickPrompts = [
  "Как начать?",
  "Как создать период?",
  "Как импортировать платежи?",
  "Где посмотреть долги?",
  "Как отправить уведомления?",
];

const safeJson = async <T,>(response: Response): Promise<T> => {
  const raw = await response.text();
  if (!raw) {
    throw new Error("Пустой ответ от сервера.");
  }
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Некорректный JSON ответ.",
    );
  }
};

export default function AssistantWidget({ variant = "public" }: AssistantWidgetProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [insertedId, setInsertedId] = useState<string | null>(null);
  const historyLoadedRef = useRef(false);
  const promptButtons = useMemo(
    () => (variant === "admin" ? quickPrompts : quickPrompts.slice(0, 2)),
    [variant],
  );
  const historyKey =
    variant === "admin" ? "assistant.history.admin" : "assistant.history.public";

  useEffect(() => {
    if (!open || historyLoadedRef.current) return;
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(historyKey);
      if (raw) {
        const parsed = JSON.parse(raw) as AssistantMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch {
      // ignore malformed history
    } finally {
      historyLoadedRef.current = true;
    }
  }, [historyKey, open]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!historyLoadedRef.current) return;
    try {
      const trimmed = messages.slice(-15);
      window.localStorage.setItem(historyKey, JSON.stringify(trimmed));
    } catch {
      // ignore storage errors
    }
  }, [historyKey, messages]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMessage: AssistantMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      text: trimmed,
    };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          pageContext: { path: pathname },
        }),
      });
      const data = await safeJson<{
        ok: boolean;
        topic?: string;
        answer?: string;
        links?: AssistantLink[];
        contextCards?: ContextCard[];
        actions?: AssistantAction[];
        drafts?: AssistantDraft[];
        error?: string;
      }>(response);
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Не удалось получить ответ.");
        return;
      }
      const assistantMessage: AssistantMessage = {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        text: data.answer ?? "",
        links: data.links,
        contextCards: data.contextCards,
        actions: data.actions,
        drafts: data.drafts,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Ошибка запроса. Попробуйте позже.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await sendMessage(message);
    setMessage("");
  };

  const handleQuickSend = async (prompt: string) => {
    await sendMessage(prompt);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(message);
      setMessage("");
    }
  };

  const handleCopy = async (id: string, text?: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(
        () => setCopiedId((current) => (current === id ? null : current)),
        2000,
      );
    } catch {
      setError("Не удалось скопировать текст.");
    }
  };

  const handleInsertDraft = (id: string, text?: string) => {
    if (!text || typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem("assistant.draft.debtorsMessage", text);
      setInsertedId(id);
      window.setTimeout(
        () => setInsertedId((current) => (current === id ? null : current)),
        2000,
      );
    } catch {
      setError("Не удалось подготовить черновик.");
    }
  };

  const statusLabel = (status?: ContextCard["status"]) => {
    switch (status) {
      case "success":
        return "Успешно";
      case "warning":
        return "Есть предупреждения";
      case "error":
        return "Ошибка";
      default:
        return "Инфо";
    }
  };

  const inputPlaceholder =
    variant === "admin"
      ? "Спросите про биллинг, долги, импорт…"
      : "Спросите про оплату, доступ, документы…";
  const canInsertDraft =
    variant === "admin" && pathname.startsWith("/admin/notifications/debtors");

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50">
      <div className="pointer-events-auto flex flex-col items-end gap-3">
        {open ? (
          <div className="w-[90vw] max-w-sm rounded-2xl border border-zinc-200 bg-white p-4 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-zinc-900">Помощник</p>
                <p className="text-xs text-zinc-500">
                  Подсказки по разделам портала.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs text-zinc-400 hover:text-zinc-600"
              >
                Закрыть
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
              <span>История сохраняется локально</span>
              <button
                type="button"
                onClick={() => {
                  setMessages([]);
                  setError(null);
                  if (typeof window !== "undefined") {
                    window.localStorage.removeItem(historyKey);
                  }
                }}
                className="text-[#5E704F] hover:underline"
              >
                Очистить
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {promptButtons.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleQuickSend(prompt)}
                  className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 transition hover:border-[#5E704F] hover:text-[#5E704F]"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <div className="mt-3 max-h-56 space-y-3 overflow-auto rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
              {messages.length === 0 ? (
                <p className="text-xs text-zinc-500">
                  Задайте вопрос — я подскажу, где найти нужный раздел.
                </p>
              ) : (
                messages.map((item) => (
                  <div key={item.id} className="space-y-1">
                    <p className="text-xs font-semibold text-zinc-500">
                      {item.role === "user" ? "Вы" : "Помощник"}
                    </p>
                    <p className="whitespace-pre-wrap text-sm text-zinc-700">
                      {item.text}
                    </p>
                    {item.links && item.links.length > 0 ? (
                      <div className="space-y-1 text-xs text-zinc-500">
                        {item.links.map((link) => (
                          <a
                            key={`${item.id}-${link.href}`}
                            href={link.href}
                            className="block text-[#5E704F] hover:underline"
                          >
                            {link.label}
                          </a>
                        ))}
                      </div>
                    ) : null}
                    {item.contextCards && item.contextCards.length > 0 ? (
                      <div className="space-y-2">
                        {item.contextCards.map((card, index) => (
                          <div
                            key={`${item.id}-card-${index}`}
                            className="rounded-lg border border-zinc-200 bg-white p-2 text-xs text-zinc-700"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-semibold text-zinc-900">{card.title}</p>
                              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600">
                                {statusLabel(card.status)}
                              </span>
                            </div>
                            <ul className="mt-1 space-y-0.5">
                              {card.lines.map((line, lineIndex) => (
                                <li key={`${item.id}-line-${lineIndex}`} className="text-zinc-600">
                                  {line}
                                </li>
                              ))}
                            </ul>
                            {card.href ? (
                              <a
                                href={card.href}
                                className="mt-1 inline-block text-[#5E704F] hover:underline"
                              >
                                Открыть
                              </a>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {item.actions && item.actions.length > 0 ? (
                      <div className="flex flex-wrap gap-2 pt-1 text-xs">
                        {item.actions.map((action, actionIndex) => {
                          const key = `${item.id}-action-${actionIndex}`;
                          if (action.type === "link" && action.href) {
                            return (
                              <a
                                key={key}
                                href={action.href}
                                className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-[#5E704F] hover:border-[#5E704F]"
                              >
                                {action.label}
                              </a>
                            );
                          }
                          if (action.type === "copy") {
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => handleCopy(key, action.text)}
                                className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-[#5E704F] hover:border-[#5E704F]"
                              >
                                {copiedId === key ? "Скопировано" : action.label}
                              </button>
                            );
                          }
                          return null;
                        })}
                      </div>
                    ) : null}
                    {item.drafts && item.drafts.length > 0 ? (
                      <div className="space-y-2 pt-2 text-xs">
                        {item.drafts.map((draft) => {
                          const key = `${item.id}-draft-${draft.id}`;
                          return (
                            <div
                              key={key}
                              className="rounded-lg border border-zinc-200 bg-white p-2"
                            >
                              <p className="font-semibold text-zinc-900">{draft.title}</p>
                              <div className="mt-1 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleCopy(key, draft.text)}
                                  className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-[#5E704F] hover:border-[#5E704F]"
                                >
                                  {copiedId === key ? "Скопировано" : "Скопировать"}
                                </button>
                                {canInsertDraft ? (
                                  <button
                                    type="button"
                                    onClick={() => handleInsertDraft(key, draft.text)}
                                    className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-[#5E704F] hover:border-[#5E704F]"
                                  >
                                    {insertedId === key ? "Готово" : "Вставить"}
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                        {canInsertDraft ? (
                          <p className="text-[11px] text-zinc-500">
                            Черновик появится в разделе должников после вставки.
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
            <form onSubmit={handleSubmit} className="mt-3 space-y-3">
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={handleKeyDown}
                rows={3}
                className="w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#5E704F]"
                placeholder={inputPlaceholder}
              />
              <button
                type="submit"
                disabled={loading || !message.trim()}
                className="w-full rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Отправляем..." : "Спросить"}
              </button>
            </form>
            <div className="mt-3 space-y-2 text-sm text-zinc-700">
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
            </div>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-[#4b5b40]"
        >
          Помощник
        </button>
      </div>
    </div>
  );
}
