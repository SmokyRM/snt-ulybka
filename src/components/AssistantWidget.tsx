"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

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
  source?: "faq" | "assistant" | "cache";
  cached?: boolean;
};

type AssistantWidgetProps = {
  variant?: "public" | "admin";
  initialAuth?: boolean;
};

const quickPrompts = [
  "Как начать?",
  "Как создать период?",
  "Как импортировать платежи?",
  "Где посмотреть долги?",
  "Как отправить уведомления?",
];

const publicChips = {
  home: [
    "Как получить доступ в кабинет?",
    "Где посмотреть документы СНТ?",
    "Где найти реквизиты?",
    "Как оплатить взносы?",
    "Как передать показания?",
    "Куда обратиться в правление?",
  ],
  access: [
    "Как получить код доступа?",
    "Что делать, если кода нет?",
    "Кто подтверждает членство?",
    "Сколько занимает проверка?",
  ],
  fees: [
    "Где найти реквизиты?",
    "Какие сроки оплаты?",
    "Что делать при долге?",
    "Как формируются начисления?",
  ],
  electricity: [
    "Как передать показания?",
    "Какой тариф действует?",
    "Когда крайний срок передачи?",
    "Что делать при спорных начислениях?",
  ],
  docs: [
    "Где устав и протоколы?",
    "Как скачать документы?",
    "Где найти шаблоны заявлений?",
    "Какие документы актуальны?",
  ],
  contacts: [
    "Как связаться с правлением?",
    "Где контакты и реквизиты?",
    "Как отправить обращение?",
    "Кому писать по доступу?",
  ],
};

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

export default function AssistantWidget({
  variant = "public",
  initialAuth,
}: AssistantWidgetProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{
    tone: "neutral" | "warn" | "info";
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
    secondaryActionLabel?: string;
    onSecondaryAction?: () => void;
  } | null>(null);
  const [lastStatus, setLastStatus] = useState<403 | 429 | 500 | null>(null);
  const [aiLocked, setAiLocked] = useState(false);
  const [aiLockedMessage, setAiLockedMessage] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(
    typeof initialAuth === "boolean" ? initialAuth : null,
  );
  const [guestBlocked, setGuestBlocked] = useState(false);
  const [activeTab, setActiveTab] = useState<"help" | "ai">("help");
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [insertedId, setInsertedId] = useState<string | null>(null);
  const historyLoadedRef = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const atBottomRef = useRef(true);
  const lastSendRef = useRef(0);
  const promptButtons = useMemo(
    () => (variant === "admin" ? quickPrompts : quickPrompts.slice(0, 2)),
    [variant],
  );
  const historyKey =
    variant === "admin" ? "assistant.history.admin" : "assistant.history.public";

  const contextualChips = useMemo(() => {
    if (variant === "admin") return promptButtons;
    if (pathname.startsWith("/access")) return publicChips.access;
    if (pathname.startsWith("/fees")) return publicChips.fees;
    if (pathname.startsWith("/electricity")) return publicChips.electricity;
    if (pathname.startsWith("/docs") || pathname.startsWith("/documents")) return publicChips.docs;
    if (pathname.startsWith("/contacts")) return publicChips.contacts;
    if (pathname === "/") return publicChips.home;
    return publicChips.home;
  }, [pathname, promptButtons, variant]);

  const uniqueChips = useMemo(() => {
    const seen = new Set<string>();
    return contextualChips.filter((chip) => {
      if (seen.has(chip)) return false;
      seen.add(chip);
      return true;
    });
  }, [contextualChips]);

  const primaryChips = uniqueChips.slice(0, 4);

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

  useEffect(() => {
    if (!open) return;
    if (typeof initialAuth === "boolean") return;
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => {
        if (cancelled) return;
        setIsAuthenticated(res.ok);
        if (res.ok) {
          setGuestBlocked(false);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setIsAuthenticated(false);
        if (process.env.NODE_ENV !== "production") {
          console.warn("[assistant] auth check failed", error);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, initialAuth, pathname, variant]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (open) setOpen(false);
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
        window.setTimeout(() => inputRef.current?.focus(), 0);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  useEffect(() => {
    if (!listRef.current) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    if (!atBottomRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (activeTab !== "ai" && guestBlocked) {
      setGuestBlocked(false);
    }
  }, [activeTab, guestBlocked]);

  const requireAuth = () => {
    if (activeTab !== "ai") return true;
    if (isAuthenticated === true) return true;
    setGuestBlocked(true);
    return false;
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!requireAuth()) return;
    const now = Date.now();
    if (now - lastSendRef.current < 400) return;
    lastSendRef.current = now;
    setLastPrompt(trimmed);
    const userMessage: AssistantMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      text: trimmed,
    };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    setError(null);
    setBanner(null);
    setLastStatus(null);
    setAiLockedMessage(null);
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
        message?: string;
        source?: "faq" | "assistant" | "cache";
        cached?: boolean;
      }>(response);
      if (!response.ok || !data.ok) {
        if (response.status === 403) {
          setAiLocked(true);
          const lockedText =
            isAuthenticated !== true
              ? "Доступен после входа."
              : data.message ?? "Доступен для правления.";
          setAiLockedMessage(lockedText);
          setActiveTab("help");
          setLastStatus(403);
          setBanner({
            tone: "neutral",
            title: "Доступ ограничен",
            message: "ИИ доступен только после входа.",
            actionLabel: "Войти",
            onAction: () => {
              router.push("/login");
            },
            secondaryActionLabel: "Как получить доступ",
            onSecondaryAction: () => router.push("/access"),
          });
        } else if (response.status === 429) {
          setLastStatus(429);
          setBanner({
            tone: "neutral",
            title: "Лимит исчерпан",
            message: "Лимит исчерпан. Справка доступна.",
          });
        } else if (response.status >= 500) {
          setLastStatus(500);
          setBanner({
            tone: "neutral",
            title: "Временно недоступно",
            message: "Сервис ответа занят. Попробуйте повторить запрос.",
            actionLabel: "Повторить",
            onAction: () => {
              if (lastPrompt) void sendMessage(lastPrompt);
            },
          });
        } else {
          setBanner({
            tone: "neutral",
            title: "Не удалось получить ответ",
            message: data.error ?? "Попробуйте другой вопрос.",
          });
        }
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
        source: data.source,
        cached: data.cached,
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
    if (!requireAuth()) return;
    await sendMessage(message);
    setMessage("");
  };

  const handleQuickSend = async (prompt: string) => {
    if (loading) return;
    setMessage(prompt);
    await sendMessage(prompt);
    setMessage("");
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!requireAuth()) return;
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

  const isAiTab = activeTab === "ai";
  const isHelpTab = activeTab === "help";
  const isGuest = isAuthenticated !== true;
  const inputPlaceholder =
    isAiTab && isGuest
      ? "🔒 Войдите, чтобы использовать ИИ-помощник"
      : "Спросите про оплату, доступ, документы…";
  const canInsertDraft =
    variant === "admin" && pathname.startsWith("/admin/notifications/debtors");

  const badgeLabel = (item: AssistantMessage) => {
    if (item.source === "faq") return "FAQ";
    if (item.source === "cache") return "Кэш";
    return "ИИ";
  };

  const handleScroll = () => {
    if (!listRef.current) return;
    const el = listRef.current;
    const threshold = 24;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  };

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50">
      <div className="pointer-events-auto flex flex-col items-end gap-3">
        {open ? (
          <div className="w-[92vw] max-w-sm rounded-2xl border border-zinc-200 bg-white p-4 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-zinc-900">Помощник</p>
                <p className="text-xs text-zinc-500">
                  Подсказки по разделам портала.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setGuestBlocked(false);
                }}
                className="text-xs text-zinc-400 hover:text-zinc-600"
              >
                Закрыть
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-full bg-zinc-100 p-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("help")}
                className={`rounded-full px-3 py-1 font-semibold transition ${
                  isHelpTab ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                Справка
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isGuest) {
                    setGuestBlocked(true);
                    setActiveTab("help");
                    return;
                  }
                  if (aiLocked) return;
                  setActiveTab("ai");
                }}
                title={isGuest ? "Доступно после входа" : aiLocked ? "Доступно после входа" : "ИИ-режим"}
                className={`rounded-full px-3 py-1 font-semibold transition ${
                  isAiTab ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                } ${isGuest || aiLocked ? "cursor-not-allowed opacity-60" : ""}`}
              >
                {isGuest ? "ИИ 🔒" : aiLocked ? "ИИ 🔒" : "ИИ"}
              </button>
            </div>
            {isGuest ? (
              <div className="mt-2 text-[11px] text-zinc-500">Доступен после входа</div>
            ) : null}

            {banner ? (
              <div
                className={`mt-3 rounded-xl border px-3 py-2 text-xs ${
                  banner.tone === "warn"
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : banner.tone === "info"
                      ? "border-sky-200 bg-sky-50 text-sky-800"
                      : "border-zinc-200 bg-zinc-50 text-zinc-700"
                }`}
              >
                <div className="font-semibold">{banner.title}</div>
                <div className="mt-1">{banner.message}</div>
                {banner.actionLabel && banner.onAction ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={banner.onAction}
                      className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700"
                    >
                      {banner.actionLabel}
                    </button>
                    {banner.secondaryActionLabel && banner.onSecondaryAction ? (
                      <button
                        type="button"
                        onClick={banner.onSecondaryAction}
                        className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700"
                      >
                        {banner.secondaryActionLabel}
                      </button>
                    ) : null}
                  </div>
                ) : null}
                {lastStatus && (lastStatus === 403 || lastStatus === 429) ? (
                  <div className="mt-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      Попробуйте так:
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {primaryChips.map((prompt) => (
                        <button
                          key={`banner-${prompt}`}
                          type="button"
                          onClick={() => handleQuickSend(prompt)}
                          disabled={loading}
                          className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 transition hover:border-[#5E704F] hover:text-[#5E704F] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {guestBlocked ? (
              <div className="mt-3 rounded-xl border border-[#5E704F]/20 bg-[#5E704F]/5 px-3 py-2 text-xs text-zinc-700">
                <div className="font-semibold">
                  ❌ Доступ ограничен. ИИ доступен только после входа.
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <a
                    href="/login"
                    className="rounded-full bg-[#5E704F] px-3 py-1 text-xs font-semibold text-white"
                  >
                    Войти
                  </a>
                  <a
                    href="/help"
                    className="rounded-full border border-[#5E704F] px-3 py-1 text-xs font-semibold text-[#5E704F]"
                  >
                    Справка
                  </a>
                </div>
              </div>
            ) : null}

            {isAiTab ? (
              <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                {aiLocked
                  ? aiLockedMessage ?? "Доступен после входа."
                  : "Подходит для объявлений, ответов, формулировок и разборов обращений."}
              </div>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              {uniqueChips.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleQuickSend(prompt)}
                  disabled={loading}
                  className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 transition hover:border-[#5E704F] hover:text-[#5E704F] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {messages.length === 0 ? (
              <div className="mt-3 rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-700">
                <p className="text-xs text-zinc-500">
                  Быстро подскажем нужный раздел. Выберите сценарий или задайте свой вопрос.
                </p>
                <div className="mt-3 grid gap-2">
                  {primaryChips.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleQuickSend(prompt)}
                      disabled={loading}
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-left text-sm font-semibold text-zinc-700 transition hover:border-[#5E704F] hover:text-[#5E704F] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div
              ref={listRef}
              onScroll={handleScroll}
              className="mt-3 max-h-56 space-y-3 overflow-auto rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm text-zinc-700"
            >
              {messages.length > 0
                ? messages.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-zinc-200 bg-white p-3 animate-assistant-in"
                  >
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span>{item.role === "user" ? "Вы" : "Помощник"}</span>
                      {item.role === "assistant" ? (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500">
                          {badgeLabel(item)}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">
                      {item.text}
                    </p>
                    {item.role === "assistant" ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => handleCopy(item.id, item.text)}
                          className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-600 hover:border-zinc-300 hover:bg-zinc-100"
                        >
                          {copiedId === item.id ? "Скопировано" : "📋 Копировать ответ"}
                        </button>
                        {item.links && item.links.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {item.links.map((link) => (
                              <a
                                key={`${item.id}-${link.href}`}
                                href={link.href}
                                className={`rounded-full border px-3 py-1 text-xs transition ${
                                  link.label === "Взносы и долги"
                                    ? "border-[#5E704F] text-[#5E704F] hover:bg-[#5E704F] hover:text-white"
                                    : "border-zinc-200 text-[#5E704F] hover:border-[#5E704F]"
                                }`}
                              >
                                {link.label === "Взносы и долги" ? `→ ${link.label}` : link.label}
                              </a>
                            ))}
                          </div>
                        ) : null}
                        {item.actions && item.actions.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {item.actions.map((action, actionIndex) => {
                              const key = `${item.id}-action-${actionIndex}`;
                              if (action.type === "link" && action.href) {
                                return (
                                  <a
                                    key={key}
                                    href={action.href}
                                    className={`rounded-full border px-3 py-1 text-xs transition ${
                                      action.label === "Взносы и долги"
                                        ? "border-[#5E704F] text-[#5E704F] hover:bg-[#5E704F] hover:text-white"
                                        : "border-zinc-200 text-[#5E704F] hover:border-[#5E704F]"
                                    }`}
                                  >
                                    {action.label === "Взносы и долги"
                                      ? `→ ${action.label}`
                                      : action.label}
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
                      </div>
                    ) : null}
                    {item.contextCards && item.contextCards.length > 0 ? (
                      <div className="mt-2 space-y-2">
                        {item.contextCards.map((card, index) => (
                          <div
                            key={`${item.id}-card-${index}`}
                            className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-xs text-zinc-700"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-semibold text-zinc-900">{card.title}</p>
                              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-zinc-600">
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
                    {item.drafts && item.drafts.length > 0 ? (
                      <div className="mt-2 space-y-2 text-xs">
                        {item.drafts.map((draft) => {
                          const key = `${item.id}-draft-${draft.id}`;
                          return (
                            <div
                              key={key}
                              className="rounded-lg border border-zinc-200 bg-zinc-50 p-2"
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
                : null}
            </div>
            {!isGuest || !isAiTab ? (
              <form onSubmit={handleSubmit} className="mt-3 space-y-3">
                <textarea
                  ref={inputRef}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#5E704F]"
                  placeholder={inputPlaceholder}
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !message.trim()}
                  className="w-full rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Отправляем..." : isAiTab ? "Спросить ИИ" : "Спросить"}
                </button>
              </form>
            ) : (
              <div className="mt-3 rounded-xl border border-[#5E704F]/20 bg-[#5E704F]/5 px-3 py-2 text-xs text-zinc-700">
                <div className="font-semibold">
                  ❌ Доступ ограничен. ИИ доступен только после входа.
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <a
                    href="/login"
                    className="rounded-full bg-[#5E704F] px-3 py-1 text-xs font-semibold text-white"
                  >
                    Войти
                  </a>
                  <a
                    href="/help"
                    className="rounded-full border border-[#5E704F] px-3 py-1 text-xs font-semibold text-[#5E704F]"
                  >
                    Справка
                  </a>
                </div>
              </div>
            )}

            {isHelpTab ? (
              <div className="mt-3 space-y-2 text-xs text-zinc-500">
                <p>
                  FAQ отвечает мгновенно и бесплатно: доступ, взносы, показания, документы.
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="/access"
                    className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 hover:border-[#5E704F] hover:text-[#5E704F]"
                  >
                    /access
                  </a>
                  <a
                    href="/fees"
                    className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 hover:border-[#5E704F] hover:text-[#5E704F]"
                  >
                    /fees
                  </a>
                  <a
                    href="/electricity"
                    className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 hover:border-[#5E704F] hover:text-[#5E704F]"
                  >
                    /electricity
                  </a>
                  <a
                    href="/docs"
                    className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 hover:border-[#5E704F] hover:text-[#5E704F]"
                  >
                    /docs
                  </a>
                </div>
              </div>
            ) : null}

            <div className="mt-3 space-y-2 text-sm text-zinc-700">
              {error ? <p className="text-sm text-zinc-600">{error}</p> : null}
            </div>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setOpen((value) => {
              const next = !value;
              if (!next) {
                setGuestBlocked(false);
              }
              return next;
            });
          }}
          className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-[#4b5b40]"
        >
          Помощник
        </button>
      </div>
    </div>
  );
}
