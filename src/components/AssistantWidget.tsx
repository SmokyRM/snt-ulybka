"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { OFFICIAL_CHANNELS } from "@/config/officialChannels";
import { PUBLIC_CONTENT_DEFAULTS } from "@/lib/publicContentDefaults";

const clampSize = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

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
type AssistantFacts = {
  verificationStatus?: string;
  plotsCount?: number;
  debtSummary?: {
    hasDebt: boolean;
    membership: boolean;
    electricity: boolean;
  };
  updatedAt?: string;
};
type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  topicTitle?: string;
  links?: AssistantLink[];
  contextCards?: ContextCard[];
  actions?: AssistantAction[];
  drafts?: AssistantDraft[];
  source?: "faq" | "assistant" | "cache";
  cached?: boolean;
  outOfScope?: boolean;
  meta?: boolean;
  suggestedKnowledge?: Array<{ slug: string; title: string; category?: string; reason?: string }>;
  suggestedTemplates?: Array<{ slug: string; title: string; reason?: string }>;
  facts?: AssistantFacts | null;
  isSmalltalk?: boolean;
};

type AssistantWidgetProps = {
  variant?: "public" | "admin";
  initialAuth?: boolean;
  initialRole?: "guest" | "user" | "board" | "admin" | null;
  aiPersonalEnabled?: boolean;
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
  initialRole = null,
  aiPersonalEnabled = false,
}: AssistantWidgetProps) {
  const pathname = usePathname();
  const router = useRouter();
  type AssistantViewState = "closed" | "minimized" | "open";
  const [viewState, setViewState] = useState<AssistantViewState>("closed");
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
  const [loadingTopic, setLoadingTopic] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [insertedId, setInsertedId] = useState<string | null>(null);
  const [chipsExpanded, setChipsExpanded] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiStyle, setAiStyle] = useState<"short" | "normal" | "detailed">("normal");
  const [aiShowSources, setAiShowSources] = useState(false);
  const [widgetSize, setWidgetSize] = useState<{ width: number; height: number } | null>(null);
  const [isMobileWidth, setIsMobileWidth] = useState(false);
  const [onboardingSeen, setOnboardingSeen] = useState<boolean>(false);
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<string>>(new Set());
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set());
  const [expandedAnswers, setExpandedAnswers] = useState<Set<string>>(new Set());
  const [helpExpanded, setHelpExpanded] = useState(false);
  const [textSize, setTextSize] = useState<"normal" | "large">("normal");
  const aiSettingsLoadedRef = useRef(false);
  const historyLoadedRef = useRef(false);
  const scrollTimeoutRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const lastTopicRef = useRef<string | null>(null);
  const atBottomRef = useRef(true);
  const lastSendRef = useRef(0);
  const lastUserPromptRef = useRef<string | null>(null);
  const lastHintModeRef = useRef<"guest" | "resident" | "staff">("guest");
  const historyKey =
    variant === "admin" ? "assistant.history.admin" : "assistant.history.public";
  const aiEnabledKey = "assistant_ai_enabled";
  const aiStyleKey = "assistant_ai_style";
  const aiSourcesKey = "assistant_ai_sources";
  const sizeStorageKey = "assistantWidgetSize:v1";
  const onboardingKey = "assistantOnboardingSeen:v1";
  const textSizeKey = "assistantTextSize:v1";
  const resizeSession = useRef<{
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);

  const aiExampleChips = useMemo(
    () => [
      "Где реквизиты?",
      "Как оплатить взносы?",
      "Как передать показания?",
      "Как получить доступ?",
      "Как подать обращение?",
    ],
    [],
  );
  const primaryChips = aiExampleChips.slice(0, 4);
  const visibleChips = chipsExpanded ? aiExampleChips : primaryChips;
  const hasMoreChips = aiExampleChips.length > primaryChips.length;
  const helpTiles = useMemo(
    () => [
      { label: "Доступ", prompt: "Как получить доступ?" },
      { label: "Финансы", prompt: "Где реквизиты?" },
      { label: "Электроэнергия", prompt: "Как передать показания?" },
      { label: "Документы", prompt: "Где найти документы?" },
      { label: "Обращения", prompt: "Как подать обращение?" },
      { label: "Реквизиты", prompt: "Как оплатить взносы?" },
    ],
    [],
  );
  const helpPrimary = helpTiles.slice(0, 4);
  const helpMore = helpTiles.slice(4);

  const clampWidth = useCallback(
    (value: number) => {
      if (typeof window === "undefined") return value;
      const minW = 320;
      const maxW = Math.min(720, Math.floor(window.innerWidth * 0.9));
      return clampSize(value, minW, maxW);
    },
    [],
  );

  const clampHeight = useCallback(
    (value: number) => {
      if (typeof window === "undefined") return value;
      const minH = 420;
      const maxH = Math.min(Math.floor(window.innerHeight * 0.85), 900);
      return clampSize(value, minH, maxH);
    },
    [],
  );
  const clarificationChips = ["Взносы", "Электроэнергия", "Долги", "Документы", "Доступ"];
  const outOfScopeRedirectChips = useMemo(() => [...clarificationChips, "Контакты"], []);

  useEffect(() => {
    if (viewState !== "open" || historyLoadedRef.current) return;
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
  }, [historyKey, viewState]);

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
    const handleResize = () => {
      setIsMobileWidth(window.innerWidth < 480);
      if (widgetSize) {
        const next = {
          width: clampWidth(widgetSize.width),
          height: clampHeight(widgetSize.height),
        };
        if (next.width !== widgetSize.width || next.height !== widgetSize.height) {
          setWidgetSize(next);
        }
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampHeight, clampWidth, widgetSize]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (widgetSize !== null) return;
    const minW = 320;
    const maxW = Math.min(720, Math.floor(window.innerWidth * 0.9));
    const minH = 420;
    const maxH = Math.min(Math.floor(window.innerHeight * 0.85), 900);
    const defaults = {
      width: clampSize(420, minW, maxW),
      height: clampSize(Math.floor(window.innerHeight * 0.72), minH, maxH),
    };
    try {
      const raw = window.localStorage.getItem(sizeStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { width?: number; height?: number } | null;
        if (parsed && typeof parsed.width === "number" && typeof parsed.height === "number") {
          const next = {
            width: clampSize(parsed.width, minW, maxW),
            height: clampSize(parsed.height, minH, maxH),
          };
          const tooSmall = parsed.width < minW || parsed.height < minH;
          setWidgetSize(tooSmall ? defaults : next);
          if (tooSmall) {
            window.localStorage.setItem(sizeStorageKey, JSON.stringify(defaults));
          }
          return;
        }
      }
    } catch {
      // ignore
    }
    setWidgetSize(defaults);
  }, [sizeStorageKey, widgetSize]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!widgetSize) return;
    try {
      window.localStorage.setItem(sizeStorageKey, JSON.stringify(widgetSize));
    } catch {
      // ignore storage errors
    }
  }, [sizeStorageKey, widgetSize]);

  useEffect(() => {
    if (viewState !== "open") return;
    if (!widgetSize) return;
    const next = {
      width: clampWidth(widgetSize.width),
      height: clampHeight(widgetSize.height),
    };
    if (next.width !== widgetSize.width || next.height !== widgetSize.height) {
      setWidgetSize(next);
    }
  }, [clampHeight, clampWidth, viewState, widgetSize]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(onboardingKey);
    setOnboardingSeen(raw === "true");
  }, [onboardingKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(textSizeKey);
    if (raw === "large" || raw === "normal") {
      setTextSize(raw);
    }
  }, [textSizeKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(textSizeKey, textSize);
    } catch {
      // ignore
    }
  }, [textSize, textSizeKey]);

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
    if (viewState !== "open") return;
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
  }, [viewState, initialAuth, pathname, variant]);

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
    setLoadingTopic(null);
    lastTopicRef.current = null;
    historyLoadedRef.current = false;
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(historyKey);
    }
  }, [historyKey]);

  const closeWidget = useCallback(() => {
    resetWidget();
    setViewState("closed");
  }, [resetWidget]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (viewState !== "closed") closeWidget();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setViewState("open");
        window.setTimeout(() => inputRef.current?.focus(), 0);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [closeWidget, viewState]);

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
        suggestedKnowledge?: Array<{ slug: string; title: string; category?: string; reason?: string }>;
        suggestedTemplates?: Array<{ slug: string; title: string; reason?: string }>;
        facts?: AssistantFacts | null;
        isSmalltalk?: boolean;
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
            title: "Техническая ошибка",
            message: "Попробуйте ещё раз.",
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
        suggestedKnowledge: data.suggestedKnowledge,
        suggestedTemplates: data.suggestedTemplates,
        facts: data.facts,
        isSmalltalk: data.isSmalltalk ?? false,
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
        suggestedKnowledge?: Array<{ slug: string; title: string; category?: string; reason?: string }>;
        suggestedTemplates?: Array<{ slug: string; title: string; reason?: string }>;
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
            title: "Техническая ошибка",
            message: "Попробуйте ещё раз.",
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
        topicTitle: lastTopicRef.current ?? undefined,
        links: data.links,
        contextCards: data.contextCards,
        actions: data.actions,
        drafts: data.drafts,
        source: data.source,
        cached: data.cached,
        outOfScope: data.outOfScope,
        suggestedKnowledge: data.suggestedKnowledge,
        suggestedTemplates: data.suggestedTemplates,
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

  const handleQuickSend = async (prompt: string, topicLabel?: string) => {
    if (loading) return;
    if (topicLabel) {
      setLoadingTopic(topicLabel);
    } else {
      setLoadingTopic("тема");
    }
    lastTopicRef.current = topicLabel ?? prompt;
    setMessage(prompt);
    await sendMessage(prompt);
    setMessage("");
    setLoadingTopic(null);
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
  const tabDescription = isHelpTab
    ? "Выберите тему — покажу порядок действий."
    : isAiTab
      ? "Напишите вопрос своими словами — отвечу по шагам."
      : "Контакты правления и часы приёма.";
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
    return "Помощник";
  };

  const stripSources = (text: string) => {
    if (!text.trim()) {
      return "Я на связи. Напишите, что нужно: взносы/электроэнергия/документы/доступ.";
    }
    const lines = text.split("\n");
    const filtered = lines.filter((line) => !line.trim().toLowerCase().startsWith("источник:"));
    const next = filtered.join("\n").trim();
    return next.length > 0 ? next : text;
  };

  const handleScroll = () => {
    if (!listRef.current) return;
    const el = listRef.current;
    const threshold = 24;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  };

  const lastPromptWordCount = lastPrompt
    ? lastPrompt.trim().split(/\s+/).filter(Boolean).length
    : 0;
  const isShortPrompt = lastPromptWordCount > 0 && lastPromptWordCount <= 6;

  const startResize = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (isMobileWidth || viewState !== "open") return;
      const size = widgetSize ?? { width: 420, height: 560 };
      resizeSession.current = {
        startX: event.clientX,
        startY: event.clientY,
        startW: size.width,
        startH: size.height,
      };
      const handleMove = (e: PointerEvent) => {
        if (!resizeSession.current) return;
        const dx = e.clientX - resizeSession.current.startX;
        const dy = e.clientY - resizeSession.current.startY;
        const nextW = clampWidth(resizeSession.current.startW + dx);
        const nextH = clampHeight(resizeSession.current.startH + dy);
        setWidgetSize({ width: nextW, height: nextH });
      };
      const handleUp = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        if (resizeSession.current) {
          try {
            const finalSize = widgetSize ?? {
              width: resizeSession.current.startW,
              height: resizeSession.current.startH,
            };
            window.localStorage.setItem(
              sizeStorageKey,
              JSON.stringify(finalSize),
            );
          } catch {
            // ignore storage errors
          }
        }
        resizeSession.current = null;
      };
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      (event.target as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
    },
    [clampHeight, clampWidth, isMobileWidth, sizeStorageKey, viewState, widgetSize],
  );

  const minimizedBar = (
    <div className="flex w-[calc(100vw-24px)] max-w-[320px] items-center justify-between rounded-full border border-zinc-200 bg-white px-4 py-2 shadow-lg">
      <span className="text-sm font-semibold text-zinc-900">Помощник</span>
      <div className="flex items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => setViewState("open")}
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

  const appliedSize = useMemo(() => {
    if (isMobileWidth) {
      return { width: "calc(100vw - 24px)", height: "80vh" };
    }
    if (widgetSize) {
      return { width: `${widgetSize.width}px`, height: `${widgetSize.height}px` };
    }
    return { width: "420px", height: "72vh" };
  }, [isMobileWidth, widgetSize]);

  const fullWindow = (
    <div
      className="relative flex min-h-[420px] min-w-[320px] max-w-[720px] flex-col rounded-2xl border border-zinc-200 bg-white shadow-lg"
      style={appliedSize}
    >
      <div className="sticky top-0 z-10 border-b border-zinc-100 bg-white px-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-zinc-900">
              Помощник СНТ «Улыбка»
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">{statusLine}</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setTextSize((prev) => (prev === "normal" ? "large" : "normal"))}
              className="min-h-[32px] rounded-full border border-zinc-200 px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:border-[#5E704F] hover:text-[#5E704F]"
              title="Размер текста"
            >
              {textSize === "normal" ? "Аа" : "АА"}
            </button>
            <button
              type="button"
              onClick={() => setViewState("minimized")}
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
              Быстрые ответы
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("ai");
              }}
              title="Задать вопрос"
              className={`rounded-full px-3 py-1 font-semibold transition ${
                isAiTab ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              Задать вопрос
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
              Связаться
            </button>
          </div>
          <p className="mt-2 text-xs text-zinc-500">{tabDescription}</p>
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
        {loading && loadingTopic ? (
          <div className="mb-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
            Открываю ответ по теме… {loadingTopic}
          </div>
        ) : null}
        {!onboardingSeen ? (
          <div className="mb-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm leading-relaxed text-zinc-700">
            <div className="font-semibold text-zinc-900">Помощник по вопросам СНТ</div>
            <p className="mt-1 text-zinc-700">
              Выберите тему или задайте вопрос — я подскажу шаги.
            </p>
            <button
              type="button"
              onClick={() => {
                setOnboardingSeen(true);
                if (typeof window !== "undefined") {
                  try {
                    window.localStorage.setItem(onboardingKey, "true");
                  } catch {
                    // ignore
                  }
                }
              }}
              className="mt-2 inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:border-[#5E704F]"
            >
              Понятно
            </button>
          </div>
        ) : null}
        {lastStatus && (lastStatus === 403 || lastStatus === 429) && !isContactsTab ? (
          <div className="mb-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Попробуйте так:
            </div>
          </div>
        ) : null}
        {isContactsTab ? (
          <div className="mb-3 space-y-3 text-sm text-zinc-700">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3">
              <p className="text-sm font-semibold text-zinc-900">Контакты правления</p>
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2">
                  <div>
                    <div className="text-sm font-semibold text-zinc-900">Телефон</div>
                    <div className="text-xs text-zinc-600">{contactPhone ?? "Уточняется"}</div>
                  </div>
                  <a
                    href={contactPhone ? `tel:${contactPhone}` : "/contacts"}
                    className="min-h-[44px] rounded-full border border-zinc-200 px-3 py-2 text-xs font-semibold text-[#5E704F] hover:border-[#5E704F]"
                  >
                    Позвонить
                  </a>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2">
                  <div>
                    <div className="text-sm font-semibold text-zinc-900">Мессенджер</div>
                    <div className="text-xs text-zinc-600">{contactTelegram ?? "Уточняется"}</div>
                  </div>
                  <a
                    href={contactTelegram ? contactTelegram : "/contacts"}
                    className="min-h-[44px] rounded-full border border-zinc-200 px-3 py-2 text-xs font-semibold text-[#5E704F] hover:border-[#5E704F]"
                  >
                    Написать
                  </a>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2">
                  <div>
                    <div className="text-sm font-semibold text-zinc-900">Email</div>
                    <div className="text-xs text-zinc-600">{contactEmail ?? "Уточняется"}</div>
                  </div>
                  <a
                    href={contactEmail ? `mailto:${contactEmail}` : "/contacts"}
                    className="min-h-[44px] rounded-full border border-zinc-200 px-3 py-2 text-xs font-semibold text-[#5E704F] hover:border-[#5E704F]"
                  >
                    Написать
                  </a>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600">
                  <div className="font-semibold text-zinc-900">Адрес / приём</div>
                  <div className="mt-1">Уточняется</div>
                  <div className="mt-1">Часы приёма: Уточняется</div>
                  <a
                    href="/contacts"
                    className="mt-2 inline-flex min-h-[44px] items-center justify-center rounded-full border border-zinc-200 px-3 py-2 text-xs font-semibold text-[#5E704F] hover:border-[#5E704F]"
                  >
                    Открыть контакты на сайте
                  </a>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        {isHelpTab ? (
          <div className="mb-3 space-y-3 text-sm text-zinc-700">
            <div className="grid grid-cols-2 gap-2">
              {helpPrimary.map((tile) => (
                <button
                  key={tile.label}
                  type="button"
                  onClick={() => handleQuickSend(tile.prompt, tile.label)}
                  disabled={loading}
                  className="min-h-[44px] rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-left text-sm font-semibold text-zinc-800 transition hover:border-[#5E704F] hover:text-[#5E704F] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {tile.label}
                </button>
              ))}
            </div>
            {helpMore.length > 0 ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setHelpExpanded((prev) => !prev)}
                  className="min-h-[44px] w-full rounded-full border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 hover:border-[#5E704F] hover:text-[#5E704F]"
                >
                  {helpExpanded ? "Скрыть темы" : "Ещё темы"}
                </button>
                {helpExpanded ? (
                  <div className="grid grid-cols-2 gap-2">
                    {helpMore.map((tile) => (
                      <button
                        key={tile.label}
                        type="button"
                        onClick={() => handleQuickSend(tile.prompt, tile.label)}
                        disabled={loading}
                        className="min-h-[44px] rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-left text-sm font-semibold text-zinc-800 transition hover:border-[#5E704F] hover:text-[#5E704F] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {tile.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
        {!isContactsTab && !isHelpTab ? (
          <>
            {!aiEnabled ? (
              <div className="mb-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
                <p>Помощник выключен. Включите, чтобы задавать вопросы.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setAiEnabled(true)}
                    className="rounded-full bg-[#5E704F] px-3 py-1 text-xs font-semibold text-white"
                  >
                    Включить помощника
                  </button>
                </div>
              </div>
            ) : isAiTab && isGuest ? (
              <div className="mb-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
                <p>
                  Помощник отвечает на общие вопросы по СНТ и сайту. Персональные ответы по участку — после
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
          className="min-h-[320px] flex-1 space-y-3 overflow-y-auto rounded-lg bg-zinc-50/60 px-2 py-2 text-sm text-zinc-700"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col gap-3 rounded-lg bg-white/70 p-3 text-xs text-zinc-600">
              <p>Задайте вопрос — я подскажу, где это на сайте.</p>
              <div className="flex flex-wrap gap-2">
                {[
                  "Где реквизиты?",
                  "Как оплатить взносы?",
                  "Как передать показания?",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleQuickSend(prompt)}
                    disabled={loading}
                    className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600 transition hover:border-[#5E704F] hover:text-[#5E704F]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((item) => (
          <div
            key={item.id}
            className="rounded-lg bg-white/80 p-3 animate-assistant-in"
          >
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>{item.role === "user" ? "Вы" : "Помощник"}</span>
              {item.role === "assistant" ? (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500">
                  {badgeLabel(item)}
                </span>
              ) : null}
            </div>
            {item.role === "assistant" && item.topicTitle ? (
              <div className="mt-1 text-[11px] font-semibold text-zinc-600">
                По теме: {item.topicTitle}
              </div>
            ) : null}
                {item.role === "assistant" && item.facts ? (
                  (() => {
                    const statusMap: Record<string, string> = {
                      pending: "На проверке",
                      verified: "Подтверждено",
                      rejected: "Отклонено",
                      draft: "Черновик",
                    };
                    const statusLabel = item.facts.verificationStatus
                      ? statusMap[item.facts.verificationStatus] ?? item.facts.verificationStatus
                      : null;
                    const debt = item.facts.debtSummary;
                    const debtParts: string[] = [];
                    if (debt?.membership) debtParts.push("взносы");
                    if (debt?.electricity) debtParts.push("электроэнергия");
                    const showDebt = typeof debt?.hasDebt === "boolean";
                    return (
                      <div className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-[11px] text-zinc-600">
                        {statusLabel ? (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-zinc-700">Статус:</span>
                            <span>{statusLabel}</span>
                          </div>
                        ) : null}
                        {showDebt ? (
                          <div className="mt-1 flex items-center gap-2">
                            <span className="font-semibold text-zinc-700">Задолженность:</span>
                            <span>
                              {debt?.hasDebt ? "есть" : "нет"}
                              {debtParts.length > 0 ? ` (${debtParts.join(", ")})` : ""}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    );
                  })()
                ) : null}
                <div className={`mt-2 ${textSize === "large" ? "text-[18px]" : "text-base"} leading-relaxed text-zinc-700`}>
                  <div
                    className={
                      !expandedAnswers.has(item.id) ? "max-h-[12em] overflow-hidden" : ""
                    }
                  >
                    {item.role === "assistant" ? stripSources(item.text) : item.text}
                  </div>
                  {item.text.length > 800 && (
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedAnswers((prev) => {
                          const next = new Set(prev);
                          if (next.has(item.id)) next.delete(item.id);
                          else next.add(item.id);
                          return next;
                        });
                      }}
                      className="mt-2 text-sm font-semibold text-[#5E704F] hover:underline"
                    >
                      {expandedAnswers.has(item.id) ? "Свернуть" : "Показать полностью"}
                    </button>
                  )}
                </div>
                {item.role === "assistant" &&
                item.id === lastAssistantId &&
                !item.meta &&
                !item.isSmalltalk &&
                (item.text.trim().length === 0 ||
                  item.text.length < 300 ||
                  /уточните|что именно|какой вариант/i.test(item.text)) &&
                (lastStatus ?? 0) < 400 &&
                !error ? (
                  <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
                    <p className="font-semibold">Уточните, пожалуйста</p>
                    <p className="mt-1 text-zinc-600">
                      Вы про взносы, электроэнергию, долги, документы или доступ?
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {clarificationChips.map((prompt) => (
                        <button
                          key={`clarify-${prompt}`}
                          type="button"
                          onClick={() => {
                            if (prompt === "Контакты") {
                              setActiveTab("contacts");
                            } else {
                              handleQuickSend(prompt);
                            }
                          }}
                          disabled={loading}
                          className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-[#5E704F] hover:text-[#5E704F]"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : item.role === "assistant" &&
                item.id === lastAssistantId &&
                item.outOfScope &&
                !item.meta ? (
                  <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
                    <p className="font-semibold">Я могу помочь и с этим</p>
                    <p className="mt-1 text-zinc-600">
                      Я в первую очередь про СНТ и портал. Отвечу кратко и привяжу к контексту СНТ.
                      Что именно нужно?
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {outOfScopeRedirectChips.map((prompt) => (
                        <button
                          key={`out-scope-${prompt}`}
                          type="button"
                          onClick={() => {
                            if (prompt === "Контакты") {
                              setActiveTab("contacts");
                            } else {
                              handleQuickSend(prompt);
                            }
                          }}
                          disabled={loading}
                          className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-[#5E704F] hover:text-[#5E704F]"
                        >
                          {prompt}
                        </button>
                      ))}
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
                  <div className="mt-2 space-y-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleCopy(item.id, item.text)}
              className={`rounded-full border border-zinc-200 bg-zinc-50 px-3 ${
                textSize === "large" ? "py-2 text-sm" : "py-1 text-xs"
              } text-zinc-600 hover:border-zinc-300 hover:bg-zinc-100`}
            >
              {copiedId === item.id ? "Скопировано" : "📋 Копировать ответ"}
            </button>
                      {item.id === lastAssistantId && item.links && item.links.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {item.links.map((link) => (
                            <a
                              key={`${item.id}-${link.href}`}
                              href={link.href}
                              className="min-h-[44px] rounded-full border border-zinc-200 px-3 py-2 text-xs text-[#5E704F] hover:border-[#5E704F]"
                            >
                              {link.label}
                            </a>
                          ))}
                        </div>
                      ) : null}
                      {item.id === lastAssistantId && item.actions && item.actions.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {item.actions.slice(0, 1).map((action, actionIndex) => {
                            const key = `${item.id}-action-${actionIndex}`;
                            if (action.type === "link" && action.href) {
                              return (
                                <a
                                  key={key}
                                  href={action.href}
                                  className="min-h-[44px] rounded-full border border-zinc-200 px-3 py-2 text-xs font-semibold text-[#5E704F] hover:border-[#5E704F]"
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
                                  className="min-h-[44px] rounded-full border border-zinc-200 px-3 py-2 text-xs font-semibold text-[#5E704F] hover:border-[#5E704F]"
                                >
                                  {copiedId === key ? "Скопировано" : action.label}
                                </button>
                              );
                            }
                            return null;
                          })}
                          {item.actions.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => {
                                setExpandedActions((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(item.id)) next.delete(item.id);
                                  else next.add(item.id);
                                  return next;
                                });
                              }}
                              className="min-h-[44px] rounded-full border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:border-[#5E704F]"
                            >
                              {expandedActions.has(item.id) ? "Скрыть действия" : "Другие действия"}
                            </button>
                          ) : null}
                          {expandedActions.has(item.id)
                            ? item.actions.slice(1).map((action, idx) => {
                                const key = `${item.id}-action-extra-${idx}`;
                                if (action.type === "link" && action.href) {
                                  return (
                                    <a
                                      key={key}
                                      href={action.href}
                                      className="min-h-[44px] rounded-full border border-zinc-200 px-3 py-2 text-xs font-semibold text-[#5E704F] hover:border-[#5E704F]"
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
                                      className="min-h-[44px] rounded-full border border-zinc-200 px-3 py-2 text-xs font-semibold text-[#5E704F] hover:border-[#5E704F]"
                                    >
                                      {copiedId === key ? "Скопировано" : action.label}
                                    </button>
                                  );
                                }
                                return null;
                              })
                            : null}
                        </div>
                      ) : null}
                    </div>
                    {item.id === lastAssistantId &&
                    item.suggestedKnowledge &&
                    item.suggestedKnowledge.length > 0 ? (
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-zinc-800">
                          <span>Материалы</span>
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedSuggestions((prev) => {
                                const next = new Set(prev);
                                if (next.has(item.id)) next.delete(item.id);
                                else next.add(item.id);
                                return next;
                              });
                            }}
                            className="text-[#5E704F] hover:underline"
                          >
                            {expandedSuggestions.has(item.id)
                              ? "Свернуть"
                              : `Подробнее (${item.suggestedKnowledge.length} материалов)`}
                          </button>
                        </div>
                        {expandedSuggestions.has(item.id)
                          ? item.suggestedKnowledge.slice(0, 2).map((sugg) => (
                              <a
                                key={`${item.id}-sugg-k-${sugg.slug}`}
                                href={`/knowledge/${sugg.slug}`}
                                className="mt-2 inline-flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-[#5E704F] hover:border-[#5E704F]"
                              >
                                <span>{sugg.title}</span>
                                <span className="text-[10px] text-zinc-500">{sugg.category}</span>
                              </a>
                            ))
                          : null}
                      </div>
                    ) : null}
                    {item.id === lastAssistantId &&
                    item.suggestedTemplates &&
                    item.suggestedTemplates.length > 0 ? (
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-zinc-800">
                          <span>Документы</span>
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedSuggestions((prev) => {
                                const next = new Set(prev);
                                const key = `${item.id}-tpl`;
                                if (next.has(key)) next.delete(key);
                                else next.add(key);
                                return next;
                              });
                            }}
                            className="text-[#5E704F] hover:underline"
                          >
                            {expandedSuggestions.has(`${item.id}-tpl`)
                              ? "Свернуть"
                              : `Документы (${item.suggestedTemplates.length} шаблонов)`}
                          </button>
                        </div>
                        {expandedSuggestions.has(`${item.id}-tpl`)
                          ? item.suggestedTemplates.slice(0, 2).map((sugg) => {
                              const href = isGuest
                                ? `/templates/${sugg.slug}`
                                : `/cabinet/templates/${sugg.slug}`;
                              return (
                                <a
                                  key={`${item.id}-sugg-t-${sugg.slug}`}
                                  href={href}
                                  className="mt-2 inline-flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-[#5E704F] hover:border-[#5E704F]"
                                >
                                  <span>{sugg.title}</span>
                                  <span className="text-[10px] text-zinc-500">Открыть</span>
                                </a>
                              );
                            })
                          : null}
                      </div>
                    ) : null}
            {item.actions && item.actions.some((action) => action.href?.startsWith("/knowledge/")) ? (
              <div className="flex flex-wrap gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                <div className="text-xs font-semibold text-zinc-800">
                  Материал из базы знаний
                </div>
                {item.actions
                  .filter((action) => action.href?.startsWith("/knowledge/"))
                  .slice(0, 1)
                  .map((action, idx) => (
                    <a
                      key={`${item.id}-knowledge-${idx}`}
                      href={action.href}
                      className="rounded-full border border-[#5E704F] px-3 py-1 text-xs font-semibold text-[#5E704F] hover:bg-[#5E704F]/10"
                    >
                      Открыть раздел
                    </a>
                  ))}
              </div>
            ) : null}
            {item.role === "assistant" && !item.isSmalltalk ? (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("contacts")}
                  className="text-xs font-semibold text-[#5E704F] hover:underline"
                >
                  Не нашли ответ? Связаться
                </button>
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
          )}
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

        {isAiTab && !(isAiTab && isGuest) && !(isAiTab && !aiEnabled) ? (
          <div className="sticky bottom-0 bg-white px-4 pb-4 pt-3">
          <div className={`flex flex-wrap gap-2 ${chipsExpanded ? "" : "max-h-14 overflow-hidden"}`}>
            {visibleChips.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleQuickSend(prompt)}
                disabled={loading}
                className="min-h-[44px] rounded-full border border-zinc-200 px-4 py-2 text-sm text-zinc-700 transition hover:border-[#5E704F] hover:text-[#5E704F] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {prompt}
              </button>
            ))}
            {hasMoreChips ? (
              <button
                type="button"
                onClick={() => setChipsExpanded((prev) => !prev)}
                className="min-h-[44px] rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-[#5E704F] hover:text-[#5E704F]"
              >
                {chipsExpanded ? "Скрыть" : "Ещё темы"}
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
              className="w-full rounded-lg bg-[#5E704F] px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-6"
            >
              {loading ? "Отправляем..." : "Задать вопрос"}
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
      {!isMobileWidth ? (
        <div
          className="absolute bottom-2 right-2 h-7 w-7 cursor-nwse-resize rounded border border-zinc-200 bg-white/80"
          onPointerDown={startResize}
          aria-label="Resize assistant"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, #d4d4d8 0, #d4d4d8 2px, transparent 2px, transparent 4px)",
            backgroundPosition: "bottom right",
            backgroundRepeat: "no-repeat",
          }}
        />
      ) : null}
    </div>
  );

  const widgetBody =
    viewState === "closed" ? null : viewState === "minimized" ? minimizedBar : fullWindow;

  // Manual checks:
  // - Desktop: chat area stays >= 60% height, footer/header sticky.
  // - Mobile: input stays visible with keyboard, history scrolls.
  // - Chips show 2 rows max, "Ещё" expands.
  // - Tabs switch without clearing history.
  return (
    <div className="pointer-events-none fixed bottom-6 right-4 z-50 sm:bottom-4">
      <div className="pointer-events-auto flex flex-col items-end gap-3">
        {widgetBody}
        {viewState === "closed" ? (
          <button
            type="button"
            onClick={() => setViewState("open")}
            className={`rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-[#4b5b40] ${
              isScrolling ? "opacity-50" : "opacity-100"
            }`}
          >
            Помощник
          </button>
        ) : null}
      </div>
    </div>
  );
}
