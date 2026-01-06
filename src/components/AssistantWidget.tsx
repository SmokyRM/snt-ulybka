"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { OFFICIAL_CHANNELS } from "@/config/officialChannels";
import { PUBLIC_CONTENT_DEFAULTS } from "@/lib/publicContentDefaults";

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
  outOfScope?: boolean;
  meta?: boolean;
};

type AssistantWidgetProps = {
  variant?: "public" | "admin";
  initialAuth?: boolean;
  initialRole?: "guest" | "user" | "board" | "admin" | null;
  aiPersonalEnabled?: boolean;
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

const isMetaPrompt = (text: string): boolean => {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;
  const match =
    normalized.includes("что ты умеешь") ||
    normalized.includes("что ты можешь") ||
    normalized.includes("помоги") ||
    normalized.includes("как пользоваться") ||
    normalized.includes("привет") ||
    normalized.includes("здравств") ||
    normalized.includes("hello");
  if (match) return true;
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length <= 3 && (normalized.includes("помощник") || normalized.includes("ии"))) {
    return true;
  }
  return false;
};

export default function AssistantWidget({
  variant = "public",
  initialAuth,
  initialRole = null,
  aiPersonalEnabled = false,
}: AssistantWidgetProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(
    typeof initialAuth === "boolean" ? initialAuth : null,
  );
  const [isVerified, setIsVerified] = useState<boolean | null>(
    typeof initialAuth === "boolean" && initialAuth && variant === "admin" ? true : null,
  );
  const [userRole, setUserRole] = useState<"guest" | "user" | "board" | "admin">(
    initialRole ?? "guest",
  );
  const [activeTab, setActiveTab] = useState<"help" | "ai" | "contacts">("help");
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [insertedId, setInsertedId] = useState<string | null>(null);
  const [chipsExpanded, setChipsExpanded] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiStyle, setAiStyle] = useState<"short" | "normal" | "detailed">("normal");
  const [aiShowSources, setAiShowSources] = useState(false);
  const aiSettingsLoadedRef = useRef(false);
  const historyLoadedRef = useRef(false);
  const scrollTimeoutRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const atBottomRef = useRef(true);
  const lastSendRef = useRef(0);
  const lastUserPromptRef = useRef<string | null>(null);
  const lastHintModeRef = useRef<"guest" | "resident" | "staff">("guest");
  const promptButtons = useMemo(
    () => (variant === "admin" ? quickPrompts : quickPrompts.slice(0, 2)),
    [variant],
  );
  const historyKey =
    variant === "admin" ? "assistant.history.admin" : "assistant.history.public";
  const aiEnabledKey = "assistant_ai_enabled";
  const aiStyleKey = "assistant_ai_style";
  const aiSourcesKey = "assistant_ai_sources";

  const contextualChips = useMemo(() => {
    if (variant === "admin") return promptButtons;
    const guest = [
      "Как получить доступ?",
      "Где реквизиты?",
      "Контакты правления",
      "Как передать показания?",
    ];
    if (isAuthenticated === true && isVerified === true) {
      return [...guest, "Сколько долг?", "Начисления", "Показания"];
    }
    if (isAuthenticated === true && isVerified === false) {
      return [...guest, "Как проходит проверка?"];
    }
    return guest;
  }, [isAuthenticated, isVerified, promptButtons, variant]);

  const uniqueChips = useMemo(() => {
    const seen = new Set<string>();
    return contextualChips.filter((chip) => {
      if (seen.has(chip)) return false;
      seen.add(chip);
      return true;
    });
  }, [contextualChips]);

  const primaryChips = uniqueChips.slice(0, 4);
  const visibleChips = chipsExpanded ? uniqueChips : primaryChips;
  const hasMoreChips = uniqueChips.length > primaryChips.length;
  const fallbackChips = useMemo(
    () => [
      "Как получить доступ?",
      "Где реквизиты?",
      "Как передать показания?",
      "Контакты правления",
    ],
    [],
  );
  const outOfScopeChips = primaryChips.length > 0 ? primaryChips : fallbackChips;

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
    if (typeof window === "undefined") return;
    if (aiSettingsLoadedRef.current) return;
    const rawEnabled = window.localStorage.getItem(aiEnabledKey);
    const rawStyle = window.localStorage.getItem(aiStyleKey);
    const rawSources = window.localStorage.getItem(aiSourcesKey);
    const nextEnabled =
      rawEnabled === "true" ? true : rawEnabled === "false" ? false : true;
    const nextStyle =
      rawStyle === "short" || rawStyle === "normal" || rawStyle === "detailed"
        ? rawStyle
        : "normal";
    const nextSources =
      rawSources === "true" ? true : rawSources === "false" ? false : false;
    setAiEnabled(nextEnabled);
    setAiStyle(nextStyle);
    setAiShowSources(nextSources);
    window.localStorage.setItem(aiEnabledKey, String(nextEnabled));
    window.localStorage.setItem(aiStyleKey, nextStyle);
    window.localStorage.setItem(aiSourcesKey, String(nextSources));
    aiSettingsLoadedRef.current = true;
  }, [aiEnabledKey, aiSourcesKey, aiStyleKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!aiSettingsLoadedRef.current) return;
    window.localStorage.setItem(aiEnabledKey, String(aiEnabled));
    window.localStorage.setItem(aiStyleKey, aiStyle);
    window.localStorage.setItem(aiSourcesKey, String(aiShowSources));
  }, [aiEnabled, aiEnabledKey, aiShowSources, aiSourcesKey, aiStyle, aiStyleKey]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolling(true);
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = window.setTimeout(() => {
        setIsScrolling(false);
        scrollTimeoutRef.current = null;
      }, 160);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    if (typeof initialAuth === "boolean") return;
    let cancelled = false;
    fetch("/api/auth/me")
      .then(async (res) => {
        if (cancelled) return;
        setIsAuthenticated(res.ok);
        if (res.ok) {
          const data = await res.json().catch(() => null);
          const status =
            typeof data?.user?.status === "string" ? data.user.status : null;
          const role =
            typeof data?.user?.role === "string" ? data.user.role : null;
          setIsVerified(status ? status === "verified" : null);
          if (role === "admin" || role === "board" || role === "user" || role === "guest") {
            setUserRole(role);
          }
        } else {
          setIsVerified(null);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setIsAuthenticated(false);
        setIsVerified(null);
        if (process.env.NODE_ENV !== "production") {
          console.warn("[assistant] auth check failed", error);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, initialAuth, pathname, variant]);

  const resetWidget = useCallback(() => {
    setMessage("");
    setMessages([]);
    setBanner(null);
    setError(null);
    setLastStatus(null);
    setLoading(false);
    setCopiedId(null);
    setInsertedId(null);
    setChipsExpanded(false);
    setActiveTab("help");
    setLastPrompt(null);
    setMinimized(false);
    historyLoadedRef.current = false;
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(historyKey);
    }
  }, [historyKey]);

  const closeWidget = useCallback(() => {
    resetWidget();
    setOpen(false);
  }, [resetWidget]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (open) closeWidget();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
        setMinimized(false);
        window.setTimeout(() => inputRef.current?.focus(), 0);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [closeWidget, open]);

  useEffect(() => {
    if (!listRef.current) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    if (!atBottomRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    setChipsExpanded(false);
  }, [activeTab]);

  const requireAuth = () => true;

  const retryLastPrompt = async () => {
    const prompt = lastUserPromptRef.current;
    if (!prompt) return;
    const hintMode = lastHintModeRef.current;
    const hintVerbosity =
      hintMode === "staff" ? "long" : hintMode === "resident" ? "normal" : "short";
    const aiPayload =
      isAiTab && aiEnabled
        ? { ai_answer_style: aiStyle, ai_show_sources: aiShowSources }
        : {};
    setLoading(true);
    setError(null);
    setBanner(null);
    setLastStatus(null);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: prompt,
          pageContext: { path: pathname },
          hint: { mode: hintMode, verbosity: hintVerbosity },
          ...aiPayload,
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
        outOfScope?: boolean;
      }>(response);
      if (!response.ok || !data.ok) {
        if (response.status === 403) {
          const lockedText =
            isAuthenticated === true
              ? "Личные данные доступны после проверки участка."
              : "Личные данные доступны после входа.";
          setActiveTab("help");
          setLastStatus(403);
          setBanner({
            tone: "neutral",
            title: "Справка доступна",
            message: lockedText,
            actionLabel: isAuthenticated === true ? undefined : "Войти",
            onAction: isAuthenticated === true ? undefined : () => {
              router.push("/login");
            },
            secondaryActionLabel: isAuthenticated === true ? undefined : "Как получить доступ",
            onSecondaryAction: isAuthenticated === true ? undefined : () => router.push("/access"),
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
              void retryLastPrompt();
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
        outOfScope: data.outOfScope,
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
    const hintMode =
      variant === "admin" ? "staff" : isVerified ? "resident" : "guest";
    const hintVerbosity =
      variant === "admin" ? "long" : isVerified ? "normal" : "short";
    const aiPayload =
      isAiTab && aiEnabled
        ? { ai_answer_style: aiStyle, ai_show_sources: aiShowSources }
        : {};
    lastUserPromptRef.current = trimmed;
    lastHintModeRef.current = hintMode;
    setLoading(true);
    setError(null);
    setBanner(null);
    setLastStatus(null);
    if (isMetaPrompt(trimmed)) {
      const suggestions =
        primaryChips.length > 0
          ? primaryChips
          : ["Как получить доступ?", "Где реквизиты?", "Как передать показания?", "Контакты правления"];
      const assistantMessage: AssistantMessage = {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        text: [
          "Официальный помощник СНТ «Улыбка».",
          "Помогу с вопросами про взносы, электроэнергию, документы, доступ и контакты/обращения.",
          "",
          "Попробуйте спросить:",
          ...suggestions.slice(0, 4).map((item) => `- ${item}`),
        ].join("\n"),
        source: "assistant",
        outOfScope: false,
        meta: true,
      };
      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setLoading(false);
      return;
    }
    setMessages((prev) => [...prev, userMessage]);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          pageContext: { path: pathname },
          hint: { mode: hintMode, verbosity: hintVerbosity },
          ...aiPayload,
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
        outOfScope?: boolean;
      }>(response);
      if (!response.ok || !data.ok) {
        if (response.status === 403) {
          const lockedText =
            isAuthenticated === true
              ? "Личные данные доступны после проверки участка."
              : "Личные данные доступны после входа.";
          setActiveTab("help");
          setLastStatus(403);
          setBanner({
            tone: "neutral",
            title: "Справка доступна",
            message: lockedText,
            actionLabel: isAuthenticated === true ? undefined : "Войти",
            onAction: isAuthenticated === true ? undefined : () => {
              router.push("/login");
            },
            secondaryActionLabel: isAuthenticated === true ? undefined : "Как получить доступ",
            onSecondaryAction: isAuthenticated === true ? undefined : () => router.push("/access"),
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
        outOfScope: data.outOfScope,
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
  const isContactsTab = activeTab === "contacts";
  const isGuest = isAuthenticated !== true;
  const roleLabel =
    userRole === "admin"
      ? "Админ"
      : userRole === "board"
        ? "Правление"
        : userRole === "user"
          ? "Житель"
          : "Гость";
  const personalStatus = !aiPersonalEnabled
    ? "Персонально: выкл"
    : userRole === "guest"
      ? "Персонально: после входа"
      : isVerified === true
        ? "Персонально: вкл"
        : "Персонально: после подтверждения";
  const statusLine = `Режим: ${roleLabel} · ${personalStatus}`;
  const inputPlaceholder = "Спросите про оплату, доступ, документы…";
  const canInsertDraft =
    variant === "admin" && pathname.startsWith("/admin/notifications/debtors");
  const aiNoticeText = isGuest
    ? "Отвечаю по сайту и вопросам СНТ."
    : isVerified === false
      ? "Общие вопросы доступны. Личное — после проверки участка."
      : "Можно спрашивать и по вашему участку (если включён расширенный режим).";
  const showContactCta = useMemo(() => {
    if (error) return true;
    const lastAssistant = [...messages].reverse().find((item) => item.role === "assistant");
    return Boolean(lastAssistant && !lastAssistant.text.trim());
  }, [error, messages]);
  const contactEmail = OFFICIAL_CHANNELS.email || PUBLIC_CONTENT_DEFAULTS.contacts.email;
  const contactPhone = PUBLIC_CONTENT_DEFAULTS.contacts.phone;
  const contactTelegram = OFFICIAL_CHANNELS.telegram || PUBLIC_CONTENT_DEFAULTS.contacts.telegram;
  const contactVk = OFFICIAL_CHANNELS.vk || PUBLIC_CONTENT_DEFAULTS.contacts.vk;
  const lastAssistantId = useMemo(() => {
    const last = [...messages].reverse().find((item) => item.role === "assistant");
    return last?.id ?? null;
  }, [messages]);

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

  const minimizedBar = (
    <div className="flex w-[calc(100vw-24px)] max-w-[320px] items-center justify-between rounded-full border border-zinc-200 bg-white px-4 py-2 shadow-lg">
      <span className="text-sm font-semibold text-zinc-900">Помощник</span>
      <div className="flex items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => setMinimized(false)}
          className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-[#5E704F] hover:text-[#5E704F]"
        >
          Развернуть
        </button>
        <button
          type="button"
          onClick={closeWidget}
          className="text-xs text-zinc-400 hover:text-zinc-600"
          aria-label="Закрыть"
        >
          ✕
        </button>
      </div>
    </div>
  );

  const fullWindow = (
    <div className="flex h-[80vh] w-[calc(100vw-24px)] min-w-[320px] max-w-[440px] flex-col rounded-2xl border border-zinc-200 bg-white shadow-lg sm:h-[72vh] sm:max-h-[760px] sm:w-[420px]">
      <div className="sticky top-0 z-10 border-b border-zinc-100 bg-white px-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-zinc-900">
              Официальный помощник СНТ «Улыбка»
            </p>
            <p className="text-xs text-zinc-500">
              Взносы · Участки · Электроэнергия · Документы · 217-ФЗ
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">{statusLine}</p>
            <p className="mt-1 text-xs text-zinc-500">{aiNoticeText}</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setMinimized(true)}
              className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-[#5E704F] hover:text-[#5E704F]"
            >
              Свернуть
            </button>
            <button
              type="button"
              onClick={closeWidget}
              className="text-xs text-zinc-400 hover:text-zinc-600"
              aria-label="Закрыть"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="mt-3 pb-3">
          <div className="flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 p-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("help")}
              className={`rounded-full px-3 py-1 font-semibold transition ${
                isHelpTab
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              Справка
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("ai");
              }}
              title="ИИ-режим"
              className={`rounded-full px-3 py-1 font-semibold transition ${
                isAiTab ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              ИИ
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("contacts")}
              className={`rounded-full px-3 py-1 font-semibold transition ${
                isContactsTab
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              Контакты
            </button>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-3">
        {banner && !isContactsTab ? (
          <div
            className={`mb-3 rounded-xl border px-3 py-2 text-xs ${
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
          </div>
        ) : null}
        {lastStatus && (lastStatus === 403 || lastStatus === 429) && !isContactsTab ? (
          <div className="mb-3">
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
        {isContactsTab ? (
          <div className="mb-3 space-y-3 text-xs text-zinc-700">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
              <p className="text-xs font-semibold text-zinc-900">Связаться с правлением</p>
              <p className="mt-1 text-zinc-600">
                Если вопрос срочный или нужен человек — напишите/позвоните.
              </p>
              <div className="mt-2 space-y-1 text-xs text-zinc-600">
                <div>Телефон: {contactPhone}</div>
                <div>Email: {contactEmail}</div>
                {contactTelegram ? <div>Telegram: {contactTelegram}</div> : null}
                {contactVk ? <div>VK: {contactVk}</div> : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href="/contacts"
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  Открыть /contacts
                </a>
              </div>
            </div>
          </div>
        ) : null}
        {isHelpTab ? (
          <div className="mb-3 space-y-3 text-xs text-zinc-700">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
              <p className="text-xs font-semibold text-zinc-900">Доступ и вход</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {["Как получить доступ?", "Как войти в кабинет?"].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleQuickSend(prompt)}
                    disabled={loading}
                    className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-[#5E704F] hover:text-[#5E704F] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
              <p className="text-xs font-semibold text-zinc-900">Оплата и документы</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {["Где реквизиты?", "Где найти документы?"].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleQuickSend(prompt)}
                    disabled={loading}
                    className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-[#5E704F] hover:text-[#5E704F] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
              <p className="text-xs font-semibold text-zinc-900">Контакты</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {["Контакты правления", "Как отправить обращение?"].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleQuickSend(prompt)}
                    disabled={loading}
                    className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-[#5E704F] hover:text-[#5E704F] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
        {!isContactsTab && !isHelpTab ? (
          <>
            {!aiEnabled ? (
              <div className="mb-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
                <p>ИИ выключен. Включите, чтобы задавать вопросы.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setAiEnabled(true)}
                    className="rounded-full bg-[#5E704F] px-3 py-1 text-xs font-semibold text-white"
                  >
                    Включить ИИ
                  </button>
                </div>
              </div>
            ) : isAiTab && isGuest ? (
              <div className="mb-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
                <p>
                  ИИ отвечает на общие вопросы по СНТ и сайту. Персональные ответы по участку — после
                  входа.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <a
                    href="/login"
                    className="rounded-full bg-[#5E704F] px-3 py-1 text-xs font-semibold text-white"
                  >
                    Войти
                  </a>
                  <button
                    type="button"
                    onClick={() => setActiveTab("contacts")}
                    className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-[#5E704F] hover:text-[#5E704F]"
                  >
                    Контакты правления
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
        <div
          ref={listRef}
          onScroll={handleScroll}
          className="min-h-[320px] flex-1 space-y-3 overflow-y-auto rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm text-zinc-700"
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
                {item.role === "assistant" &&
                item.id === lastAssistantId &&
                item.outOfScope &&
                !item.meta ? (
                  <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
                    <p className="font-semibold">
                      Я отвечаю по вопросам СНТ «Улыбка» и сайта.
                    </p>
                    <p className="mt-1 text-zinc-600">
                      Попробуйте сформулировать вопрос конкретнее или выберите тему ниже.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {outOfScopeChips.map((prompt) => (
                        <button
                          key={`out-scope-${prompt}`}
                          type="button"
                          onClick={() => handleQuickSend(prompt)}
                          disabled={loading}
                          className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-[#5E704F] hover:text-[#5E704F]"
                        >
                          {prompt}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setActiveTab("contacts")}
                        className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-[#5E704F] hover:text-[#5E704F]"
                      >
                        Контакты
                      </button>
                    </div>
                  </div>
                ) : item.role === "assistant" &&
                item.id === lastAssistantId &&
                ((lastStatus ?? 0) >= 500 || Boolean(error)) &&
                !item.meta ? (
                  <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
                    <p className="font-semibold">Техническая ошибка.</p>
                    <p className="mt-1 text-zinc-600">Попробуйте ещё раз.</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void retryLastPrompt()}
                        className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-[#5E704F] hover:text-[#5E704F]"
                      >
                        Повторить
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("contacts")}
                        className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-[#5E704F] hover:text-[#5E704F]"
                      >
                        Контакты
                      </button>
                    </div>
                  </div>
                ) : item.role === "assistant" &&
                item.id === lastAssistantId &&
                (!item.text.trim() ||
                  item.text.toLowerCase().includes("не удалось найти точный ответ")) &&
                !item.meta ? (
                  <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
                    <p className="font-semibold">Не удалось найти точный ответ</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab("contacts")}
                        className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-[#5E704F] hover:text-[#5E704F]"
                      >
                        Написать в правление
                      </button>
                      <a
                        href="/contacts"
                        className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-[#5E704F] hover:text-[#5E704F]"
                      >
                        Контакты
                      </a>
                    </div>
                  </div>
                ) : null}
                {item.role === "assistant" ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => handleCopy(item.id, item.text)}
                      className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-600 hover:border-zinc-300 hover:bg-zinc-100"
                    >
                      {copiedId === item.id ? "Скопировано" : "📋 Копировать ответ"}
                    </button>
                    {item.id === lastAssistantId && item.links && item.links.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {item.links.map((link) => (
                          <a
                            key={`${item.id}-${link.href}`}
                            href={link.href}
                            className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-[#5E704F] hover:border-[#5E704F]"
                          >
                            {link.label}
                          </a>
                        ))}
                      </div>
                    ) : null}
                    {item.id === lastAssistantId && item.actions && item.actions.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
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
          {loading ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-3">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span className="inline-flex h-3 w-3 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
                🤖 Генерирую ответ…
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {!isContactsTab && !(isAiTab && isGuest) && !(isAiTab && !aiEnabled) ? (
        <div className="sticky bottom-0 bg-white px-4 pb-4 pt-3">
          <div className={`flex flex-wrap gap-2 ${chipsExpanded ? "" : "max-h-14 overflow-hidden"}`}>
            {visibleChips.map((prompt) => (
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
            {hasMoreChips ? (
              <button
                type="button"
                onClick={() => setChipsExpanded((prev) => !prev)}
                className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-600 transition hover:border-[#5E704F] hover:text-[#5E704F]"
              >
                {chipsExpanded ? "Скрыть" : "Ещё"}
              </button>
            ) : null}
          </div>
          <form onSubmit={handleSubmit} className="mt-3 space-y-3">
            <textarea
              ref={inputRef}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              className="w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#5E704F]"
              placeholder={inputPlaceholder}
            />
            <button
              type="submit"
              disabled={!message.trim()}
              className="w-full rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-6"
            >
              {loading ? "Отправляем..." : isAiTab ? "Спросить ИИ" : "Спросить"}
            </button>
          </form>
          {error ? (
            <p className="mt-2 text-xs text-zinc-500">{error}</p>
          ) : showContactCta ? (
            <button
              type="button"
              onClick={() => setActiveTab("contacts")}
              className="mt-2 text-xs font-semibold text-[#5E704F] hover:underline"
            >
              Связаться с правлением
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  const widgetBody = !open ? null : minimized ? minimizedBar : fullWindow;

  // Manual checks:
  // - Desktop: chat area stays >= 60% height, footer/header sticky.
  // - Mobile: input stays visible with keyboard, history scrolls.
  // - Chips show 2 rows max, "Ещё" expands.
  // - Tabs switch without clearing history.
  return (
    <div className="pointer-events-none fixed bottom-6 right-4 z-50 sm:bottom-4">
      <div className="pointer-events-auto flex flex-col items-end gap-3">
        {widgetBody}
        <button
          type="button"
          onClick={() => {
            if (open) {
              if (minimized) {
                setMinimized(false);
                return;
              }
              closeWidget();
              return;
            }
            setOpen(true);
            setMinimized(false);
          }}
          className={`rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-[#4b5b40] ${
            isScrolling ? "opacity-50" : "opacity-100"
          }`}
        >
          Помощник
        </button>
      </div>
    </div>
  );
}
