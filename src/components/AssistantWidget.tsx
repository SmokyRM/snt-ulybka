"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
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
type AssistantAction =
  | {
      type: "link" | "copy";
      label: string;
      href?: string;
      text?: string;
    }
  | {
      id: string;
      kind: "navigate";
      label: string;
      href: string;
      testId?: string;
    }
  | {
      id: string;
      kind: "inline";
      label: string;
      payload: { type: "requisites"; data?: Record<string, string> | null; text?: string };
      testId?: string;
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
  inlineType?: "requisites" | "deadend";
  source?: "faq" | "assistant" | "cache";
  cached?: boolean;
  outOfScope?: boolean;
  meta?: boolean;
  suggestedKnowledge?: Array<{ slug: string; title: string; category?: string; reason?: string }>;
  suggestedTemplates?: Array<{ slug: string; title: string; reason?: string }>;
  facts?: AssistantFacts | null;
  isSmalltalk?: boolean;
  provider?: "openai" | "fallback";
  engineSource?: "llm" | "kb" | "fallback";
  latencyMs?: number;
  requestId?: string;
  intent?: string;
  usedFallback?: boolean;
  sourceHints?: string[];
};

type AssistantWidgetProps = {
  variant?: "public" | "admin";
  initialAuth?: boolean;
  initialRole?: "guest" | "user" | "board" | "admin" | null;
  aiPersonalEnabled?: boolean;
};

function TabBar({
  activeTab,
  onChange,
}: {
  activeTab: "help" | "ai" | "contacts";
  onChange: (tab: "help" | "ai" | "contacts") => void;
}) {
  const isHelpTab = activeTab === "help";
  const isAiTab = activeTab === "ai";
  const isContactsTab = activeTab === "contacts";
  return (
    <div
      className="flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 p-1 text-xs"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onChange("help");
        }}
        className={`rounded-full px-3 py-1 font-semibold transition ${
          isHelpTab ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
        }`}
      >
        Быстрые ответы
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onChange("ai");
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
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onChange("contacts");
        }}
        className={`rounded-full px-3 py-1 font-semibold transition ${
          isContactsTab ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
        }`}
      >
        Связаться
      </button>
  </div>
);
}

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
  const zone = useMemo<"public" | "cabinet" | "office" | "admin">(() => {
    if (pathname.startsWith("/admin")) return "admin";
    if (pathname.startsWith("/office")) return "office";
    if (pathname.startsWith("/cabinet")) return "cabinet";
    return "public";
  }, [pathname]);
  const moduleHint = useMemo(() => {
    if (pathname.startsWith("/office/appeals")) return "office.appeals";
    if (pathname.startsWith("/office/finance")) return "office.finance";
    if (pathname.startsWith("/office/registry")) return "office.registry";
    if (pathname.startsWith("/admin/debts") || pathname.startsWith("/admin/billing")) return "admin.fees";
    if (pathname.startsWith("/cabinet/billing")) return "cabinet.fees";
    return undefined;
  }, [pathname]);
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
  const showProviderBadge = useMemo(
    () => process.env.NODE_ENV !== "production" || userRole === "admin",
    [userRole],
  );
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"help" | "ai" | "contacts">("help");
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const [loadingTopic, setLoadingTopic] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [insertedId, setInsertedId] = useState<string | null>(null);
  const [aiStyle, setAiStyle] = useState<"short" | "normal" | "detailed">("normal");
  const [aiShowSources, setAiShowSources] = useState(false);
  const [widgetSize, setWidgetSize] = useState<{ width: number; height: number } | null>(null);
  const [isMobileWidth, setIsMobileWidth] = useState(false);
  const [onboardingSeen, setOnboardingSeen] = useState<boolean>(false);
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set());
  const [expandedAnswers, setExpandedAnswers] = useState<Set<string>>(new Set());
  const [helpExpanded, setHelpExpanded] = useState(false);
  const [textSize, setTextSize] = useState<"normal" | "large">("normal");
  const [lastTopicAnswer, setLastTopicAnswer] = useState<AssistantMessage | null>(null);
  const [unreadAppeals, setUnreadAppeals] = useState<number>(0);
  const [uiScale, setUiScale] = useState<number>(1);
  const [loadingText, setLoadingText] = useState("Генерирую ответ…");
  const [feedback, setFeedback] = useState<Record<string, "up" | "down">>({});
  const [deadEndShown, setDeadEndShown] = useState(false);
  const [deadEndReason, setDeadEndReason] = useState<"thumbs" | "repeat" | null>(null);
  const [historyKey, setHistoryKey] = useState<string | null>(null);
  const aiSettingsLoadedRef = useRef(false);
  const historyLoadedRef = useRef(false);
  const scrollTimeoutRef = useRef<number | null>(null);
  const loadingTimersRef = useRef<number[]>([]);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const lastTopicRef = useRef<string | null>(null);
  const atBottomRef = useRef(true);
  const lastSendRef = useRef(0);
  const lastUserPromptRef = useRef<string | null>(null);
  const lastHintModeRef = useRef<"guest" | "resident" | "staff">("guest");
  const aiStyleKey = "assistant_ai_style";
  const aiSourcesKey = "assistant_ai_sources";
  const sizeStorageKey = "assistantWidgetSize:v1";
  const onboardingKey = "assistantOnboardingSeen:v1";
  const textSizeKey = "assistantTextSize:v1";
  const uiScaleKey = "assistantUiScale:v1";
  const feedbackLoadedRef = useRef(false);
  const resizeSession = useRef<{
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);
  const scaleSession = useRef<{
    startX: number;
    startScale: number;
  } | null>(null);

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
  const clampScale = useCallback((value: number) => clampSize(value, 0.9, 1.25), []);
  const clarificationChips = ["Взносы", "Электроэнергия", "Долги", "Документы", "Доступ"];
  const outOfScopeRedirectChips = [...clarificationChips, "Контакты"];

  useEffect(() => {
    const newKey = `assistant_history:${userId ?? "guest"}:${userRole ?? "guest"}:${zone}`;
    setHistoryKey(newKey);
    historyLoadedRef.current = false;
  }, [userId, userRole, zone]);

  useEffect(() => {
    if (!historyKey) return;
    historyLoadedRef.current = false;
    setMessages([]);
    setLastTopicAnswer(null);
    feedbackLoadedRef.current = false;
    setFeedback({});
  }, [historyKey]);

  useEffect(() => {
    if (historyLoadedRef.current) return;
    if (typeof window === "undefined") return;
    if (!historyKey) return;
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
  }, [historyKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!historyLoadedRef.current) return;
    if (!historyKey) return;
    try {
      const trimmed = messages.slice(-20);
      window.localStorage.setItem(historyKey, JSON.stringify(trimmed));
    } catch {
      // ignore storage errors
    }
  }, [historyKey, messages]);

  useEffect(() => {
    if (!historyKey) return;
    if (feedbackLoadedRef.current) return;
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(`assistant_feedback:${historyKey}`);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, "up" | "down">;
        if (parsed && typeof parsed === "object") {
          setFeedback(parsed);
        }
      }
    } catch {
      // ignore
    } finally {
      feedbackLoadedRef.current = true;
    }
  }, [historyKey]);

  useEffect(() => {
    if (!historyKey) return;
    if (!feedbackLoadedRef.current) return;
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(`assistant_feedback:${historyKey}`, JSON.stringify(feedback));
    } catch {
      // ignore
    }
  }, [feedback, historyKey]);

  useEffect(() => {
    if (!loading) {
      loadingTimersRef.current.forEach((id) => window.clearTimeout(id));
      loadingTimersRef.current = [];
      setLoadingText("Генерирую ответ…");
      return;
    }
    setLoadingText("Генерирую ответ…");
    const timers: number[] = [];
    timers.push(
      window.setTimeout(() => {
        setLoadingText("Думаю…");
      }, 3000),
    );
    timers.push(
      window.setTimeout(() => {
        setLoadingText("Ищу в базе знаний…");
      }, 7000),
    );
    timers.push(
      window.setTimeout(() => {
        setLoadingText("Формирую ответ… (это может занять немного времени)");
      }, 15000),
    );
    loadingTimersRef.current = timers;
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      loadingTimersRef.current = [];
    };
  }, [loading]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (aiSettingsLoadedRef.current) return;
    const rawStyle = window.localStorage.getItem(aiStyleKey);
    const rawSources = window.localStorage.getItem(aiSourcesKey);
    const nextStyle =
      rawStyle === "short" || rawStyle === "normal" || rawStyle === "detailed"
        ? rawStyle
        : "normal";
    const nextSources =
      rawSources === "true" ? true : rawSources === "false" ? false : false;
    setAiStyle(nextStyle);
    setAiShowSources(nextSources);
    window.localStorage.setItem(aiStyleKey, nextStyle);
    window.localStorage.setItem(aiSourcesKey, String(nextSources));
    aiSettingsLoadedRef.current = true;
  }, [aiSourcesKey, aiStyleKey]);

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
    if (viewState === "closed") return;
    if (isAuthenticated !== true) return;
    let cancelled = false;
    fetch("/api/appeals/my")
      .then((res) => res.json().catch(() => null))
      .then((data) => {
        if (cancelled) return;
        if (data && typeof data.unreadCount === "number") {
          setUnreadAppeals(data.unreadCount);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, viewState]);
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
    const raw = window.localStorage.getItem(uiScaleKey);
    if (!raw) return;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    setUiScale(clampScale(parsed));
  }, [clampScale, uiScaleKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(uiScaleKey, String(clampScale(uiScale)));
    } catch {
      // ignore
    }
  }, [clampScale, uiScale, uiScaleKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(uiScaleKey);
    if (!raw) return;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    setUiScale(clampScale(parsed));
  }, [clampScale, uiScaleKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(uiScaleKey, String(clampScale(uiScale)));
    } catch {
      // ignore
    }
  }, [clampScale, uiScale, uiScaleKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(uiScaleKey);
    if (!raw) return;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    setUiScale(clampScale(parsed));
  }, [clampScale, uiScaleKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(uiScaleKey, String(clampScale(uiScale)));
    } catch {
      // ignore
    }
  }, [clampScale, uiScale, uiScaleKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!aiSettingsLoadedRef.current) return;
    window.localStorage.setItem(aiStyleKey, aiStyle);
    window.localStorage.setItem(aiSourcesKey, String(aiShowSources));
  }, [aiShowSources, aiSourcesKey, aiStyle, aiStyleKey]);

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
          const id = typeof data?.user?.id === "string" ? data.user.id : null;
          setIsVerified(status ? status === "verified" : null);
          if (role === "admin" || role === "board" || role === "user" || role === "guest") {
            setUserRole(role);
          }
          if (id) setUserId(id);
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
    setActiveTab("help");
    setLastPrompt(null);
    setLoadingTopic(null);
    lastTopicRef.current = null;
    historyLoadedRef.current = false;
    if (typeof window !== "undefined" && historyKey) {
      window.localStorage.removeItem(historyKey);
    }
  }, [historyKey]);

  const closeWidget = useCallback(() => {
    resetWidget();
    setViewState("closed");
  }, [resetWidget]);

  useEffect(() => {
    if (viewState === "closed") return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (rootRef.current && target && rootRef.current.contains(target)) return;
      closeWidget();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeWidget, viewState]);

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
    if (!last) return;
    if (!isNearBottom()) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!listRef.current) return;
    if (!lastTopicAnswer) return;
    if (!isNearBottom()) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [lastTopicAnswer]);

  const requireAuth = () => true;

  const retryLastPrompt = async () => {
    const prompt = lastUserPromptRef.current;
    if (!prompt) return;
    const hintMode = lastHintModeRef.current;
    const hintVerbosity =
      hintMode === "staff" ? "long" : hintMode === "resident" ? "normal" : "short";
  const aiPayload = isAiTab ? { ai_answer_style: aiStyle, ai_show_sources: aiShowSources } : {};
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
          pageContext: { path: pathname, zone, module: moduleHint },
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
        error_code?: string;
        message?: string;
        source?: "faq" | "assistant" | "cache";
        cached?: boolean;
        outOfScope?: boolean;
        suggestedKnowledge?: Array<{ slug: string; title: string; category?: string; reason?: string }>;
        suggestedTemplates?: Array<{ slug: string; title: string; reason?: string }>;
        facts?: AssistantFacts | null;
        isSmalltalk?: boolean;
        provider?: "openai" | "fallback";
        latencyMs?: number;
        requestId?: string;
        intent?: string;
        usedFallback?: boolean;
        sourceHints?: string[];
        engineSource?: "llm" | "kb" | "fallback";
      }>(response);
      const hasApiError = Boolean(data.error || data.error_code);
      if (!response.ok || !data.ok || hasApiError) {
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
        } else if (response.status >= 500 || hasApiError) {
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
            message: data.error ?? data.error_code ?? "Попробуйте другой вопрос.",
          });
        }
        return;
      }
      const hasHistory = messages.length > 0;
      const askedScope =
        /что.*(умеешь|можешь|отвечаешь)|о чем.*(отвечать|говоришь)/i.test(lastPrompt ?? "");
      let answerText = data.answer ?? "";
      let links = data.links;
      const actions = data.actions;
      let contextCards = data.contextCards;
      if (data.topic === "public-help" && !data.isSmalltalk && hasHistory && !askedScope) {
        answerText =
          "Давайте по делу: подскажу по взносам, электроэнергии, документам и доступу. Сформулируйте вопрос — отвечу коротко.";
        // Убираем лишний шум, оставляем компактные ссылки, если есть
        links = (links ?? []).slice(0, 3);
        contextCards = [];
      }

    const assistantMessage: AssistantMessage = {
      id: `${Date.now()}-assistant`,
      role: "assistant",
      text: answerText,
      links,
      contextCards,
      actions,
      drafts: data.drafts,
      source: data.source,
      engineSource: data.engineSource,
      cached: data.cached,
      outOfScope: data.outOfScope,
      suggestedKnowledge: data.suggestedKnowledge,
      suggestedTemplates: data.suggestedTemplates,
      facts: data.facts,
      isSmalltalk: data.isSmalltalk ?? false,
      provider: data.provider,
      latencyMs: data.latencyMs,
      requestId: data.requestId,
      intent: data.intent,
      usedFallback: data.usedFallback,
      sourceHints: data.sourceHints,
    };
      setMessages((prev) => [...prev, assistantMessage]);
      if (lastTopicRef.current) {
        setLastTopicAnswer(assistantMessage);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Ошибка запроса. Попробуйте позже.";
      setError(message);
    } finally {
      setLoading(false);
      setLoadingTopic(null);
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
    const aiPayload = isAiTab ? { ai_answer_style: aiStyle, ai_show_sources: aiShowSources } : {};
    lastUserPromptRef.current = trimmed;
    lastHintModeRef.current = hintMode;
    setDeadEndShown(false);
    setDeadEndReason(null);
    setLoading(true);
    setError(null);
    setBanner(null);
    setLastStatus(null);
    setMessages((prev) => [...prev, userMessage]);
    const recentUserMessages = [...messages, userMessage].filter((m) => m.role === "user");
    const normalized = (text: string) =>
      text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
    if (recentUserMessages.length >= 2) {
      const lastNormalized = normalized(userMessage.text);
      const lastSix = recentUserMessages.slice(-6).map((m) => normalized(m.text));
      const similarCount = lastSix
        .slice(0, -1)
        .filter(
          (t) =>
            t.length > 5 &&
            lastNormalized.length > 5 &&
            (t.includes(lastNormalized) || lastNormalized.includes(t)),
        ).length;
      if (similarCount >= 1 && !deadEndShown) {
        showDeadEndCard("repeat");
      }
    }
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          pageContext: { path: pathname, zone, module: moduleHint },
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
        error_code?: string;
        message?: string;
        source?: "faq" | "assistant" | "cache";
        cached?: boolean;
        outOfScope?: boolean;
        suggestedKnowledge?: Array<{ slug: string; title: string; category?: string; reason?: string }>;
        suggestedTemplates?: Array<{ slug: string; title: string; reason?: string }>;
        isSmalltalk?: boolean;
        provider?: "openai" | "fallback";
        engineSource?: "llm" | "kb" | "fallback";
        latencyMs?: number;
        requestId?: string;
        intent?: string;
        usedFallback?: boolean;
        sourceHints?: string[];
      }>(response);
      const hasApiError = Boolean(data.error || data.error_code);
      if (!response.ok || !data.ok || hasApiError) {
        if (hasApiError && !response.ok) {
          // keep below handlers
        }
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
        } else if (response.status >= 500 || hasApiError) {
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
        engineSource: (data as { engineSource?: "llm" | "kb" | "fallback" }).engineSource,
        cached: data.cached,
        outOfScope: data.outOfScope,
        suggestedKnowledge: data.suggestedKnowledge,
        suggestedTemplates: data.suggestedTemplates,
        isSmalltalk: data.isSmalltalk ?? false,
        provider: (data as { provider?: "openai" | "fallback" }).provider,
        latencyMs: (data as { latencyMs?: number }).latencyMs,
        requestId: (data as { requestId?: string }).requestId,
        intent: (data as { intent?: string }).intent,
        usedFallback: (data as { usedFallback?: boolean }).usedFallback,
        sourceHints: (data as { sourceHints?: string[] }).sourceHints,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      if (lastTopicRef.current) {
        setLastTopicAnswer(assistantMessage);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Ошибка запроса. Попробуйте позже.";
      setError(message);
    } finally {
      setLoading(false);
      setLoadingTopic(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!requireAuth()) return;
    setActiveTab("ai");
    await sendMessage(message);
    setMessage("");
  };

  const handleQuickSend = async (prompt: string, topicLabel?: string) => {
    if (loading) return;
    setLoadingTopic(topicLabel ?? "тема");
    setLastTopicAnswer(null);
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
      setActiveTab("ai");
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

  const handleActionNavigation = useCallback(
    (href: string | undefined, e: React.MouseEvent | React.KeyboardEvent) => {
      if (!href) return;
      e.preventDefault();
      e.stopPropagation();
      router.push(href);
    },
    [router],
  );

  const handleInlineAction = (action: AssistantAction) => {
    if (!("kind" in action) || action.kind !== "inline") return;
    if (action.payload.type === "requisites") {
      const text =
        action.payload.text?.trim() ||
        (action.payload.data
          ? Object.values(action.payload.data)
              .filter(Boolean)
              .join("\n")
          : "Реквизиты пока не указаны. Свяжитесь с правлением для уточнения.");
      const inlineMessage: AssistantMessage = {
        id: `${Date.now()}-inline-requisites`,
        role: "assistant",
        text: text,
        inlineType: "requisites",
        meta: true,
      };
      setMessages((prev) => [...prev, inlineMessage]);
    }
  };

  const logDeadEnd = async (trigger: "thumbs" | "repeat") => {
    try {
      await fetch("/api/assistant/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "assistant_dead_end",
          trigger,
          zone,
          module: moduleHint,
          pathname,
          role: userRole ?? "guest",
          userId: userId ?? "guest",
        }),
      });
    } catch {
      // ignore
    }
  };

  const showDeadEndCard = (trigger: "thumbs" | "repeat") => {
    if (deadEndShown) return;
    setDeadEndShown(true);
    setDeadEndReason(trigger);
    void logDeadEnd(trigger);
    const appealHref =
      zone === "office"
        ? "/office/appeals"
        : zone === "admin"
          ? "/admin/appeals"
          : isGuest
            ? "/login?next=/cabinet/appeals/new"
            : "/cabinet/appeals/new";
    const contactsHref = "/contacts";
    const deadEndMessage: AssistantMessage = {
      id: `${Date.now()}-deadend`,
      role: "assistant",
      text: "Похоже, ответ не помог. Создать обращение или перейти к контактам?",
      inlineType: "deadend",
      meta: true,
      actions: [
        { id: "deadend-appeal", kind: "navigate", label: "Создать обращение", href: appealHref, testId: "assistant-deadend-create-appeal" },
        { id: "deadend-contacts", kind: "navigate", label: "Открыть контакты", href: contactsHref, testId: "assistant-deadend-contacts" },
      ],
    };
    setMessages((prev) => [...prev, deadEndMessage]);
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

  const handleFeedback = async (messageId: string, rating: "up" | "down") => {
    const current = feedback[messageId];
    const nextRating = current === rating ? undefined : rating;
    setFeedback((prev) => {
      const copy = { ...prev };
      if (nextRating) copy[messageId] = nextRating;
      else delete copy[messageId];
      return copy;
    });
    try {
      await fetch("/api/assistant/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId,
          conversationKey: historyKey,
          userId: userId ?? "guest",
          role: userRole ?? "guest",
          zone,
          rating: nextRating ?? null,
          context: { page: pathname, module: moduleHint },
          module: moduleHint,
          pathname,
        }),
      });
    } catch {
      // best effort
    }
    if (rating === "down") {
      showDeadEndCard("thumbs");
    }
  };

  const clearHistory = () => {
    if (typeof window === "undefined") return;
    if (historyKey) {
      try {
        window.localStorage.removeItem(historyKey);
        window.localStorage.removeItem(`assistant_feedback:${historyKey}`);
      } catch {
        // ignore
      }
    }
    setMessages([]);
    setLastTopicAnswer(null);
    historyLoadedRef.current = true;
    feedbackLoadedRef.current = true;
    setFeedback({});
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
  const showStatusLine = userRole === "admin" || process.env.NODE_ENV !== "production";
  const statusLine = `Режим: ${roleLabel} · ${personalStatus}`;
  const inputPlaceholder = isAiTab
    ? "Напишите вопрос (Enter — отправить, Shift+Enter — перенос)"
    : "Спросите про оплату, доступ, документы…";
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
  const isFakePhone = (() => {
    if (!contactPhone) return true;
    const digits = contactPhone.replace(/\D+/g, "");
    if (!digits) return true;
    if (/^0+$/.test(digits)) return true;
    if (/0000000/.test(contactPhone) || /\+7\s*\(000\)/.test(contactPhone)) return true;
    return false;
  })();
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

  const isNearBottom = () => {
    if (!listRef.current) return true;
    const el = listRef.current;
    const threshold = 24;
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  };

  const handleScroll = () => {
    atBottomRef.current = isNearBottom();
  };

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

  const startScaleDrag = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (isMobileWidth || viewState !== "open") return;
      scaleSession.current = { startX: event.clientX, startScale: uiScale };
      const handleMove = (e: MouseEvent) => {
        if (!scaleSession.current) return;
        const deltaX = e.clientX - scaleSession.current.startX;
        const next = clampScale(scaleSession.current.startScale + deltaX * 0.002);
        setUiScale(next);
      };
      const handleUp = () => {
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleUp);
        scaleSession.current = null;
      };
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
    },
    [clampScale, isMobileWidth, uiScale, viewState],
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
            <div className="flex items-start gap-2">
              {!isMobileWidth ? (
                <div
                  role="presentation"
                  onMouseDown={startScaleDrag}
                  className="flex h-8 w-8 cursor-ew-resize select-none items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-[10px] font-semibold text-zinc-600 shadow-inner"
                  title="Тяните, чтобы увеличить или уменьшить масштаб"
                  aria-label="Управление масштабом"
                >
                  <span
                    className="block h-6 w-6"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(135deg, #d4d4d8 0, #d4d4d8 2px, transparent 2px, transparent 4px)",
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat",
                    }}
                  />
                </div>
              ) : null}
            <div>
              <p className="text-sm font-semibold text-zinc-900">
                Помощник СНТ «Улыбка»
              </p>
              {showStatusLine ? (
                <p className="mt-1 text-[11px] text-zinc-500">{statusLine}</p>
              ) : null}
            </div>
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
              onClick={clearHistory}
              className="min-h-[32px] rounded-full border border-zinc-200 px-3 py-1 text-[11px] font-semibold text-zinc-700 hover:border-[#5E704F] hover:text-[#5E704F]"
              data-testid="assistant-clear-history"
            >
              Начать заново
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
          <TabBar activeTab={activeTab} onChange={setActiveTab} />
          <p className="mt-2 text-sm text-zinc-600">{tabDescription}</p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3">
        <div
          className="origin-top-left"
          style={{
            transform: `scale(${uiScale})`,
            transformOrigin: "top left",
            width: `${(1 / uiScale) * 100}%`,
          }}
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
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
            <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-base font-semibold text-zinc-900">Контакты правления</p>
                  <p className="text-xs text-zinc-600">
                    Свяжитесь удобным способом или отправьте обращение.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
                    <div>
                      <div className="text-sm font-semibold text-zinc-900">Телефон</div>
                      <div className="text-xs text-zinc-600">
                        {isFakePhone ? "Телефон уточняется" : contactPhone ?? "Телефон уточняется"}
                      </div>
                    </div>
                    {!isFakePhone && contactPhone ? (
                      <a
                        href={`tel:${contactPhone}`}
                        className="flex h-10 items-center rounded-xl bg-[#5E704F] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4b5b40]"
                      >
                        Позвонить
                      </a>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
                    <div>
                      <div className="text-sm font-semibold text-zinc-900">Мессенджер</div>
                      <div className="text-xs text-zinc-600">{contactTelegram ?? "Уточняется"}</div>
                    </div>
                    <a
                      href={contactTelegram ? contactTelegram : "/contacts"}
                      className="flex h-10 items-center rounded-xl border border-[#D7DDCF] bg-white px-4 text-sm font-semibold text-[#5E704F] transition hover:bg-[#F4F6F1]"
                    >
                      Написать
                    </a>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
                    <div>
                      <div className="text-sm font-semibold text-zinc-900">Email</div>
                      <div className="text-xs text-zinc-600">{contactEmail ?? "Уточняется"}</div>
                    </div>
                    <Link
                      href={contactEmail ? `mailto:${contactEmail}` : "/contacts"}
                      className="flex h-10 items-center rounded-xl border border-[#D7DDCF] bg-white px-4 text-sm font-semibold text-[#5E704F] transition hover:bg-[#F4F6F1]"
                    >
                      Написать
                    </Link>
                  </div>
                  <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
                    <div className="font-semibold text-zinc-900">Адрес и приём</div>
                    <div className="mt-1">
                      Адрес и часы приёма уточняются. Позвоните или напишите — подскажем.
                    </div>
                  </div>
                  {!isGuest && unreadAppeals > 0 ? (
                    <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                      <div>
                        <div className="text-sm font-semibold text-zinc-900">Ответы по обращениям</div>
                        <div className="text-xs text-zinc-700">Новых ответов: {unreadAppeals}</div>
                      </div>
                      <Link
                        href="/cabinet/appeals"
                        className="flex h-10 items-center rounded-xl border border-amber-200 bg-white px-4 text-sm font-semibold text-amber-900 transition hover:border-amber-400"
                      >
                        Открыть
                      </Link>
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={
                      isGuest
                        ? "/login?next=/cabinet/appeals/new"
                        : `/cabinet/appeals/new${
                            lastUserPromptRef.current
                              ? `?prefill=${encodeURIComponent(lastUserPromptRef.current)}`
                              : ""
                          }`
                    }
                    className="flex h-10 items-center rounded-xl bg-[#5E704F] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4b5b40]"
                  >
                    Написать в правление
                  </Link>
                  <a
                    href="/contacts"
                    className="flex h-10 items-center rounded-xl border border-[#D7DDCF] bg-white px-4 text-sm font-semibold text-[#5E704F] transition hover:bg-[#F4F6F1]"
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
              {helpPrimary.map((tile) => {
                const isTileLoading = loading && loadingTopic === tile.label;
                return (
                  <button
                    key={tile.label}
                    type="button"
                    onClick={() => handleQuickSend(tile.prompt, tile.label)}
                    disabled={loading}
                    className={`min-h-[44px] rounded-xl border px-3 py-3 text-left text-sm font-semibold transition ${
                      isTileLoading
                        ? "border-[#5E704F] bg-[#5E704F]/5 text-[#5E704F]"
                        : "border-zinc-200 bg-zinc-50 text-zinc-800 hover:border-[#5E704F] hover:text-[#5E704F]"
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <span className="inline-flex items-center gap-2">
                      {tile.label}
                      {isTileLoading ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#5E704F]/60 border-t-transparent" />
                      ) : null}
                    </span>
                  </button>
                );
              })}
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
                    {helpMore.map((tile) => {
                      const isTileLoading = loading && loadingTopic === tile.label;
                      return (
                        <button
                          key={tile.label}
                          type="button"
                          onClick={() => handleQuickSend(tile.prompt, tile.label)}
                          disabled={loading}
                          className={`min-h-[44px] rounded-xl border px-3 py-3 text-left text-sm font-semibold transition ${
                            isTileLoading
                              ? "border-[#5E704F] bg-[#5E704F]/5 text-[#5E704F]"
                              : "border-zinc-200 bg-zinc-50 text-zinc-800 hover:border-[#5E704F] hover:text-[#5E704F]"
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          <span className="inline-flex items-center gap-2">
                            {tile.label}
                            {isTileLoading ? (
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#5E704F]/60 border-t-transparent" />
                            ) : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
        {!isContactsTab && !isHelpTab ? (
          <>
            {isAiTab && isGuest ? (
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
        {isHelpTab ? (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain rounded-lg bg-zinc-50/60 px-2 py-2 text-sm text-zinc-700">
            {lastTopicAnswer ? (
              <div className="rounded-lg bg-white/80 p-3 animate-assistant-in">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Помощник</span>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500">
                    По теме
                  </span>
                </div>
                {lastTopicAnswer.topicTitle ? (
                  <div className="mt-1 text-[11px] font-semibold text-zinc-600">
                    По теме: {lastTopicAnswer.topicTitle}
                  </div>
                ) : null}
                <div
                  className={`mt-2 ${textSize === "large" ? "text-[18px]" : "text-base"} leading-relaxed text-zinc-700`}
                >
                  {stripSources(lastTopicAnswer.text)}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 rounded-lg bg-white/70 p-3 text-xs text-zinc-600">
                <p>Выберите тему, чтобы увидеть ответ.</p>
              </div>
            )}
          </div>
        ) : (
          <div
            ref={listRef}
            onScroll={handleScroll}
            className="flex-1 min-h-0 space-y-3 overflow-y-auto overscroll-contain rounded-lg bg-zinc-50/60 px-2 py-2 text-sm text-zinc-700"
            data-testid="assistant-messages-scroll"
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
              messages.map((item) => {
                const showFacts = item.role === "assistant" && item.facts;
                const isLastAssistant = item.role === "assistant" && item.id === lastAssistantId;
                const shouldClarify =
                  item.role === "assistant" &&
                  isLastAssistant &&
                  !item.meta &&
                  !item.isSmalltalk &&
                  ((item.text.trim().length === 0 ||
                    (item.text.length < 250 &&
                      !/(1\\)|1\\.|шаг|перейдите|сделайте|✅/i.test(item.text))) ||
                    /уточните|что именно|какой вариант/i.test(item.text)) &&
                  (lastStatus ?? 0) < 400 &&
                  !error;
                const shouldOutOfScope =
                  item.role === "assistant" &&
                  isLastAssistant &&
                  item.outOfScope &&
                  !item.meta;
                const shouldError =
                  item.role === "assistant" &&
                  isLastAssistant &&
                  ((lastStatus ?? 0) >= 500 || Boolean(error)) &&
                  !item.meta;
                const shouldNoAnswer =
                  item.role === "assistant" &&
                  isLastAssistant &&
                  (!item.text.trim() ||
                    item.text.toLowerCase().includes("не удалось найти точный ответ")) &&
                  !item.meta;

                return (
                  <div
                    key={item.id}
                    className="animate-assistant-in rounded-lg bg-white/80 p-3"
                  >
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span>{item.role === "user" ? "Вы" : "Помощник"}</span>
                      <div className="flex items-center gap-2">
                        {showProviderBadge && item.role === "assistant" && item.provider ? (
                          <span
                            data-testid="assistant-provider-badge"
                            className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600"
                          >
                            ИИ: {item.provider}
                            {typeof item.latencyMs === "number" ? ` · ${Math.round(item.latencyMs)}мс` : ""}
                          </span>
                        ) : null}
        {showProviderBadge && item.role === "assistant" ? (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500">
            intent: {item.intent ?? "—"}
            {item.engineSource
              ? ` · source: ${item.engineSource}`
              : item.sourceHints?.length
                ? ` · source: ${item.sourceHints.join("/")}`
                : ""}
            {typeof item.latencyMs === "number" ? ` · ${Math.round(item.latencyMs)}мс` : ""}
            {item.requestId ? ` · req: ${item.requestId.slice(0, 6)}` : ""}
          </span>
        ) : null}
        {item.role === "assistant" ? (
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500">
                            {badgeLabel(item)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {item.usedFallback && showProviderBadge ? (
                      <div className="mt-1 text-[11px] text-amber-600">
                        Сейчас отвечаю в упрощённом режиме (ИИ недоступен).
                      </div>
                    ) : null}
                    {item.role === "assistant" && item.topicTitle ? (
                      <div className="mt-1 text-[11px] font-semibold text-zinc-600">
                        По теме: {item.topicTitle}
                      </div>
                    ) : null}

                    {showFacts ? (
                      (() => {
                        const statusMap: Record<string, string> = {
                          pending: "На проверке",
                          verified: "Подтверждено",
                          rejected: "Отклонено",
                          draft: "Черновик",
                        };
                        const statusLabel = item.facts?.verificationStatus
                          ? statusMap[item.facts.verificationStatus] ?? item.facts.verificationStatus
                          : null;
                        const debt = item.facts?.debtSummary;
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

                    {item.inlineType === "requisites" ? (
                      <div
                        className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700"
                        data-testid="assistant-requisites-card"
                      >
                        <p className="font-semibold text-zinc-800">Реквизиты для оплаты</p>
                        <p className="mt-1 whitespace-pre-line text-zinc-700">{item.text}</p>
                      </div>
                    ) : item.inlineType === "deadend" ? (
                      <div
                        className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700"
                        data-testid="assistant-deadend-card"
                      >
                        <p className="font-semibold text-zinc-800">Похоже, ответ не помог</p>
                        <p className="mt-1 text-zinc-700">
                          Хотите создать обращение или открыть контакты?
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            data-testid="assistant-deadend-create-appeal"
                            onClick={(e) => {
                              const action = item.actions?.find(
                                (a) => "kind" in a && a.id === "deadend-appeal" && a.kind === "navigate",
                              ) as Extract<AssistantAction, { kind: "navigate" }> | undefined;
                              handleActionNavigation(action?.href, e);
                              setDeadEndShown(false);
                              setDeadEndReason(null);
                            }}
                            className="min-h-[40px] rounded-full border border-zinc-200 px-3 py-2 text-xs font-semibold text-[#5E704F] hover:border-[#5E704F]"
                          >
                            Создать обращение
                          </button>
                          <button
                            type="button"
                            data-testid="assistant-deadend-contacts"
                            onClick={(e) => {
                              const contactAction =
                                item.actions?.find(
                                  (a) => "kind" in a && a.id === "deadend-contacts" && a.kind === "navigate",
                                ) as Extract<AssistantAction, { kind: "navigate" }> | undefined;
                              handleActionNavigation(contactAction?.href ?? "/contacts", e);
                              setDeadEndShown(false);
                              setDeadEndReason(null);
                            }}
                            className="min-h-[40px] rounded-full border border-zinc-200 px-3 py-2 text-xs font-semibold text-[#5E704F] hover:border-[#5E704F]"
                          >
                            Открыть контакты
                          </button>
                          <button
                            type="button"
                            data-testid="assistant-deadend-clear"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              clearHistory();
                              setMessages([]);
                              setDeadEndShown(false);
                              setDeadEndReason(null);
                            }}
                            className="min-h-[40px] rounded-full border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:border-[#5E704F]"
                          >
                            Начать заново
                          </button>
                        </div>
                      </div>
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

                    {shouldClarify ? (
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
                    ) : null}

                    {shouldOutOfScope ? (
                      <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
                        <p className="font-semibold">Я могу помочь и с этим</p>
                        <p className="mt-1 text-zinc-600">
                          Я в первую очередь про СНТ и портал. Отвечу кратко и привяжу к контексту СНТ.
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
                    ) : null}

                    {shouldError ? (
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
                    ) : null}

                    {shouldNoAnswer ? (
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
                            className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-[#5E704F] hover:border-[#5E704F]"
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
                          {isLastAssistant && item.links && item.links.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {item.links.map((link) => (
                                <button
                                  key={`${item.id}-${link.href}`}
                                  type="button"
                                  onClick={(e) => handleActionNavigation(link.href, e)}
                                  className="min-h-[44px] rounded-full border border-zinc-200 px-3 py-2 text-xs font-semibold text-[#5E704F] hover:border-[#5E704F]"
                                >
                                  {link.label}
                                </button>
                              ))}
                            </div>
                          ) : null}
                          {isLastAssistant && item.actions && item.actions.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {item.actions.slice(0, 1).map((action, actionIndex) => {
                                const key = "kind" in action ? action.id ?? `${item.id}-action-${actionIndex}` : `${item.id}-action-${actionIndex}`;
                                if ("kind" in action) {
                                  if (action.kind === "navigate") {
                                    return (
                                      <button
                                        key={key}
                                        type="button"
                                        data-testid={action.testId}
                                        onClick={(e) => handleActionNavigation(action.href, e)}
                                        className="min-h-[44px] rounded-full border border-zinc-200 px-3 py-2 text-xs font-semibold text-[#5E704F] hover:border-[#5E704F]"
                                      >
                                        {action.label}
                                      </button>
                                    );
                                  }
                                  if (action.kind === "inline" && action.payload?.type === "requisites") {
                                    return (
                                      <button
                                        key={key}
                                        type="button"
                                        data-testid={action.testId}
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          handleInlineAction(action);
                                        }}
                                        className="min-h-[44px] rounded-full border border-zinc-200 px-3 py-2 text-xs font-semibold text-[#5E704F] hover:border-[#5E704F]"
                                      >
                                        {action.label}
                                      </button>
                                    );
                                  }
                                  return null;
                                }
                                if (action.type === "link" && action.href) {
                                  return (
                                    <button
                                      key={key}
                                      type="button"
                                      onClick={(e) => handleActionNavigation(action.href, e)}
                                      className="min-h-[44px] rounded-full border border-zinc-200 px-3 py-2 text-xs font-semibold text-[#5E704F] hover:border-[#5E704F]"
                                    >
                                      {action.label}
                                    </button>
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
                                    const key = "kind" in action ? action.id ?? `${item.id}-action-extra-${idx}` : `${item.id}-action-extra-${idx}`;
                                    if ("kind" in action) {
                                      if (action.kind === "navigate") {
                                        return (
                                          <button
                                            key={key}
                                            type="button"
                                            data-testid={action.testId}
                                            onClick={(e) => handleActionNavigation(action.href, e)}
                                            className="min-h-[44px] rounded-full border border-zinc-200 px-3 py-2 text-xs font-semibold text-[#5E704F] hover:border-[#5E704F]"
                                          >
                                            {action.label}
                                          </button>
                                        );
                                      }
                                      if (action.kind === "inline" && action.payload?.type === "requisites") {
                                        return (
                                          <button
                                            key={key}
                                            type="button"
                                            data-testid={action.testId}
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              handleInlineAction(action);
                                            }}
                                            className="min-h-[44px] rounded-full border border-zinc-200 px-3 py-2 text-xs font-semibold text-[#5E704F] hover:border-[#5E704F]"
                                          >
                                            {action.label}
                                          </button>
                                        );
                                      }
                                      return null;
                                    }
                                    if (action.type === "link" && action.href) {
                                      return (
                                        <button
                                          key={key}
                                          type="button"
                                          onClick={(e) => handleActionNavigation(action.href, e)}
                                          className="min-h-[44px] rounded-full border border-zinc-200 px-3 py-2 text-xs font-semibold text-[#5E704F] hover:border-[#5E704F]"
                                        >
                                          {action.label}
                                        </button>
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
                            {isLastAssistant &&
                            item.suggestedKnowledge &&
                            item.suggestedKnowledge.length > 0 ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {item.suggestedKnowledge.slice(0, 3).map((sugg) => (
                                  <button
                                    key={`${item.id}-sugg-k-${sugg.slug}`}
                                    type="button"
                                    onClick={(e) => handleActionNavigation(`/knowledge/${sugg.slug}`, e)}
                                    className="min-h-[40px] rounded-full border border-zinc-200 px-3 py-2 text-xs font-semibold text-[#5E704F] hover:border-[#5E704F]"
                                  >
                                    {sugg.title}
                                  </button>
                                ))}
                              </div>
                        ) : null}
                        {isLastAssistant &&
                        item.suggestedTemplates &&
                        item.suggestedTemplates.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {item.suggestedTemplates.slice(0, 2).map((sugg) => {
                              const href = isGuest
                                ? `/templates/${sugg.slug}`
                                : `/cabinet/templates/${sugg.slug}`;
                              return (
                                <button
                                  key={`${item.id}-sugg-t-${sugg.slug}`}
                                  type="button"
                                  onClick={(e) => handleActionNavigation(href, e)}
                                  className="min-h-[40px] rounded-full border border-zinc-200 px-3 py-2 text-xs font-semibold text-[#5E704F] hover:border-[#5E704F]"
                                >
                                {sugg.title}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-zinc-600">
                          <span className="text-zinc-500">Было полезно?</span>
                          <button
                            type="button"
                            data-testid="assistant-feedback-up"
                            aria-pressed={feedback[item.id] === "up"}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              void handleFeedback(item.id, "up");
                            }}
                            className={`rounded-full border px-3 py-1 transition ${
                              feedback[item.id] === "up"
                                ? "border-[#5E704F] bg-[#E7EDE0] text-[#2F3A28]"
                                : "border-zinc-200 bg-white text-zinc-600 hover:border-[#5E704F] hover:text-[#5E704F]"
                            }`}
                          >
                            👍
                          </button>
                          <button
                            type="button"
                            data-testid="assistant-feedback-down"
                            aria-pressed={feedback[item.id] === "down"}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              void handleFeedback(item.id, "down");
                            }}
                            className={`rounded-full border px-3 py-1 transition ${
                              feedback[item.id] === "down"
                                ? "border-[#5E704F] bg-[#E7EDE0] text-[#2F3A28]"
                                : "border-zinc-200 bg-white text-zinc-600 hover:border-[#5E704F] hover:text-[#5E704F]"
                            }`}
                          >
                            👎
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab("contacts")}
                          className="text-xs font-semibold text-[#5E704F] hover:underline"
                        >
                          Не нашли ответ? Связаться
                        </button>
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
                );
              })
            )}
            {loading ? (
              <div className="rounded-xl border border-zinc-200 bg-white p-3" data-testid="assistant-loading-indicator">
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span className="inline-flex h-3 w-3 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
                  <span data-testid="assistant-loading-text">{loadingText}</span>
                </div>
              </div>
            ) : null}
          </div>
        )}
        </div>
        </div>
      </div>

      {isAiTab && !(isAiTab && isGuest) ? (
        <div className="sticky bottom-0 bg-white px-4 pb-4 pt-3">
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
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                disabled={!message.trim()}
                className="w-full rounded-lg bg-[#5E704F] px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-6"
              >
                {loading ? "Отправляем..." : "Задать вопрос"}
              </button>
              <span className="text-xs text-zinc-500">Enter — отправить, Shift+Enter — перенос</span>
            </div>
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
      <div ref={rootRef} className="pointer-events-auto flex flex-col items-end gap-3">
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
