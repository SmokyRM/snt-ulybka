import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { getSessionUser } from "@/lib/session.server";
import { logAdminAction } from "@/lib/audit";
import {
  listAccrualItems,
  listAccrualPeriods,
  listImportBatches,
  listPayments,
} from "@/lib/mockDb";
import { categoryForAccrualType } from "@/lib/paymentCategory";
import { getMembershipTariffSetting } from "@/lib/membershipTariff";
import { getPublicContent } from "@/lib/publicContentStore";
import { getFeatureFlags, isFeatureEnabled } from "@/lib/featureFlags";
import { OpenAIKeyMissingError, createOpenAIClient } from "@/lib/openai.server";
import { searchSiteIndex } from "@/lib/ai/siteIndex";
import { listDocuments } from "@/lib/documentsStore";
import { listKnowledgeArticles } from "@/lib/knowledgeStore";
import { DEFAULT_AI_SETTINGS, getAiSettings } from "@/lib/aiSettings";
import { enforceAiRateLimit, logAiUsage, type AiUsageSource } from "@/lib/aiUsageStore";

type AssistantBody = {
  message: string;
  pageContext?: { path?: string };
  role?: string;
  hint?: {
    mode?: "guest" | "resident" | "staff";
    verbosity?: "short" | "normal" | "long";
  };
};

type Topic =
  | "public-help"
  | "staff-billing"
  | "staff-imports"
  | "staff-debts"
  | "staff-debtors";

const staffRoles = new Set(["admin", "board", "accountant", "operator"]);
type Role = "guest" | "user" | "board" | "chair" | "admin";
type RolePermissions = {
  can_view_own_debts: boolean;
  can_view_debtors: boolean;
  can_export_reports: boolean;
  can_manage_periods: boolean;
};
type ContextCardStatus = "success" | "warning" | "error" | "info";
type ContextCard = {
  title: string;
  lines: string[];
  href?: string;
  status?: ContextCardStatus;
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

type AssistantHint = {
  mode: "guest" | "resident" | "staff";
  verbosity: "short" | "normal" | "long";
};

const normalizeRole = (input?: string | null): Role => {
  if (input === "admin") return "admin";
  if (input === "chair") return "chair";
  if (input === "board") return "board";
  if (input === "user") return "user";
  return "guest";
};

const getRolePermissions = (role: Role): RolePermissions => {
  if (role === "admin" || role === "board" || role === "chair") {
    return {
      can_view_own_debts: true,
      can_view_debtors: true,
      can_export_reports: true,
      can_manage_periods: true,
    };
  }
  if (role === "user") {
    return {
      can_view_own_debts: true,
      can_view_debtors: false,
      can_export_reports: false,
      can_manage_periods: false,
    };
  }
  return {
    can_view_own_debts: false,
    can_view_debtors: false,
    can_export_reports: false,
    can_manage_periods: false,
  };
};

const CACHE_TTL_SECONDS = 60 * 20;
const CONTEXT_VERSION = "v1";
const MAX_OUTPUT_TOKENS = 600;
const MAX_ANSWER_CHARS = MAX_OUTPUT_TOKENS * 4;
const KV_URL = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

type AssistantPayload = {
  topic: Topic;
  answer: string;
  links: { label: string; href: string }[];
  contextCards: ContextCard[];
  actions: AssistantAction[];
  drafts: AssistantDraft[];
};

const topicFiles: Record<Topic, string> = {
  "public-help": "public-help.md",
  "staff-billing": "staff-billing.md",
  "staff-imports": "staff-imports.md",
  "staff-debts": "staff-debts.md",
  "staff-debtors": "staff-debtors.md",
};

const topicLinks: Record<Topic, { label: string; href: string }[]> = {
  "public-help": [
    { label: "Помощь", href: "/help" },
    { label: "Как получить доступ", href: "/access" },
    { label: "Документы", href: "/documents" },
  ],
  "staff-billing": [
    { label: "Биллинг", href: "/admin/billing" },
    { label: "Импорт платежей", href: "/admin/billing/import" },
    { label: "Долги", href: "/admin/debts" },
  ],
  "staff-imports": [
    { label: "Импорт реестра", href: "/admin/imports/plots" },
    { label: "Импорт платежей", href: "/admin/billing/import" },
    { label: "Журнал импортов", href: "/admin/billing/imports" },
  ],
  "staff-debts": [
    { label: "Долги", href: "/admin/debts" },
    { label: "Должники", href: "/admin/notifications/debtors" },
  ],
  "staff-debtors": [
    { label: "Должники", href: "/admin/notifications/debtors" },
    { label: "Долги", href: "/admin/debts" },
  ],
};

const inferTopic = (text: string, pathHint: string | null): Topic => {
  const source = `${text} ${pathHint ?? ""}`.toLowerCase();
  if (/(billing|начисл|период|тариф)/i.test(source)) return "staff-billing";
  if (/(import|импорт|csv|выпис)/i.test(source)) return "staff-imports";
  if (/(debtors?|должник|уведом)/i.test(source)) return "staff-debtors";
  if (/(debt|долг|задолж)/i.test(source)) return "staff-debts";
  return "public-help";
};

const ALLOWED_PATH_PREFIXES = [
  "/documents",
  "/docs",
  "/fees",
  "/electricity",
  "/contacts",
  "/help",
  "/access",
  "/login",
  "/cabinet/verification",
  "/cabinet",
  "/news",
  "/about",
  "/updates",
];

const ALLOWED_TOPIC_REGEX =
  /(снт|улыбк|участок|кадастр|правлен|взнос|оплат|реквизит|платеж|показан|электро|документ|устав|протокол|контакт|доступ|провер|регистрац|кабинет|сайт|портал|логин|вход|фз-?217|217[-\s]?фз|импорт|реестр|csv|начисл|долг|должник|уведом|тариф|обращен|правила)/i;

const isAllowedTopic = (text: string, pathHint: string | null, strictMode: boolean) => {
  const trimmed = text.trim();
  if (!trimmed) return true;
  const source = `${trimmed} ${pathHint ?? ""}`;
  if (ALLOWED_TOPIC_REGEX.test(source)) return true;
  if (!strictMode && pathHint) {
    return ALLOWED_PATH_PREFIXES.some((prefix) => pathHint.startsWith(prefix));
  }
  return false;
};

const shortenAnswer = (text: string) => {
  const trimmed = text.trim();
  const match = trimmed.match(/^[^.!?]+[.!?]/);
  if (match) return match[0].trim();
  if (trimmed.length <= 220) return trimmed;
  return `${trimmed.slice(0, 220).trim()}…`;
};

const applyAiSettings = (payload: AssistantPayload, settings: typeof DEFAULT_AI_SETTINGS) => {
  const answerStyle =
    settings.ai_answer_style === "short" ||
    settings.ai_answer_style === "normal" ||
    settings.ai_answer_style === "detailed"
      ? settings.ai_answer_style
      : DEFAULT_AI_SETTINGS.ai_answer_style;
  const tone =
    settings.ai_tone === "official" || settings.ai_tone === "simple"
      ? settings.ai_tone
      : DEFAULT_AI_SETTINGS.ai_tone;
  const next: AssistantPayload = { ...payload };
  if (settings.verbosity === "short" || answerStyle === "short") {
    next.answer = shortenAnswer(next.answer);
  }
  if (answerStyle === "detailed") {
    next.answer = `${next.answer.trim()}\n\nЕсли нужна детализация, уточните контекст — подскажу шаги.`;
  }
  if (tone === "simple") {
    const trimmedAnswer = next.answer.trim();
    next.answer = trimmedAnswer.startsWith("Просто:") ? trimmedAnswer : `Просто: ${trimmedAnswer}`;
  }
  if (!settings.citations || settings.ai_show_sources === false) {
    next.links = [];
    next.actions = [];
  }
  if (settings.temperature === "medium") {
    const tail = "\n\nЕсли нужно, расскажу подробнее.";
    if (!next.answer.includes("подробнее")) {
      next.answer = `${next.answer.trim()}${tail}`;
    }
  }
  if (settings.ai_show_sources) {
    const linkSources = Array.isArray(next.links) ? next.links.map((link) => link.href) : [];
    const sources =
      linkSources.length > 0 ? linkSources : ["/help", "/docs", "/fees", "/electricity"];
    if (sources.length > 0 && !next.answer.includes("Источник:")) {
      next.answer = `${next.answer.trim()}\n\nИсточник: ${sources.join(", ")}`;
    }
  }
  return next;
};

const applyResponseHints = (payload: AssistantPayload, hint: AssistantHint): AssistantPayload => {
  const next: AssistantPayload = { ...payload };
  if (hint.verbosity === "short") {
    next.answer = shortenAnswer(next.answer);
  }
  if (hint.mode === "guest") {
    const contactLink = { label: "Контакты", href: "/contacts" };
    if (!next.links.some((link) => link.href === contactLink.href)) {
      next.links = [...next.links, contactLink];
      next.actions = [...next.actions, { type: "link", label: "Контакты", href: "/contacts" }];
    }
  }
  if (hint.mode === "resident") {
    const trimmed = next.answer.trim();
    if (!trimmed.endsWith("?")) {
      next.answer = `${trimmed}\n\nЕсли нужно уточнение, подскажите участок или период.`;
    }
  }
  if (hint.mode === "staff") {
    next.answer = [
      next.answer.trim(),
      "",
      "Чек-лист:",
      "- Проверьте последние данные в кабинете или разделе админки.",
      "- Сверьте период и тип начислений.",
      "- При необходимости уточните информацию у правления.",
    ].join("\n");
  }
  return next;
};

const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

const callOpenAI = async ({
  apiKey,
  system,
  user,
  temperature,
}: {
  apiKey: string;
  system: string;
  user: string;
  temperature: number;
}): Promise<string> => {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature,
      max_tokens: MAX_OUTPUT_TOKENS,
    }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `OpenAI error ${response.status}`);
  }
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Empty OpenAI response");
  }
  return content;
};

const buildSystemPrompt = (context: string) =>
  [
    "Ты официальный помощник СНТ «Улыбка» и сайта.",
    "Отвечай кратко, по делу, без выдумок и без персональных данных, если они не предоставлены.",
    "Если вопрос неясный — задай один уточняющий вопрос.",
    context ? `Контекст:\n${context}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

const resolveTemperature = (settings: typeof DEFAULT_AI_SETTINGS) =>
  settings.temperature === "medium" ? 0.6 : 0.2;

const isGreeting = (text: string) => {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;
  return (
    /\b(привет|здравствуйте|hi|hello)\b/i.test(normalized) ||
    /\bдобрый\s+(день|вечер)\b/i.test(normalized)
  );
};

const isNavigationQuery = (text: string) =>
  /(где\s+(найти|посмотреть|находится)|как\s+(сделать|создать|оформить|подать|получить|войти|добавить|оплатить|передать)|куда\s+нажать|не\s+могу\s+найти)/i.test(
    text,
  );

const mergeActions = (base: AssistantAction[], extra: AssistantAction[]) => {
  const seen = new Set(base.map((action) => `${action.type}:${action.href ?? action.label}`));
  const next = [...base];
  extra.forEach((action) => {
    const key = `${action.type}:${action.href ?? action.label}`;
    if (seen.has(key)) return;
    seen.add(key);
    next.push(action);
  });
  return next;
};

const buildRoleActions = (role: Role): AssistantAction[] => {
  if (role === "user") {
    return [
      { type: "link", label: "Финансы", href: "/cabinet?section=finance" },
      { type: "link", label: "Электроэнергия", href: "/cabinet?section=electricity" },
      { type: "link", label: "Написать обращение", href: "/cabinet?section=appeals" },
    ];
  }
  if (role === "board") {
    return [
      { type: "link", label: "Финансы (админ)", href: "/admin/billing" },
      { type: "link", label: "Импорт", href: "/admin/imports/plots" },
      { type: "link", label: "Должники", href: "/admin/debts" },
    ];
  }
  if (role === "admin" || role === "chair") {
    return [
      { type: "link", label: "Финансы (админ)", href: "/admin/billing" },
      { type: "link", label: "Должники", href: "/admin/debts" },
      { type: "link", label: "Настройки ИИ", href: "/admin/ai-usage" },
    ];
  }
  return [];
};

const buildDocActions = async (
  query: string,
  role: Role,
): Promise<AssistantAction[]> => {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const docs = await listDocuments();
  const published = docs.filter((doc) => doc.published);
  const scored = published
    .map((doc) => {
      const haystack = `${doc.title} ${doc.description ?? ""} ${doc.slug} ${
        doc.category
      }`.toLowerCase();
      const score = tokens.reduce((acc, token) => (haystack.includes(token) ? acc + 1 : acc), 0);
      return { doc, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  const actions = scored.map(({ doc }) => {
    const hasAccess =
      role === "admin"
        ? true
        : role === "board" || role === "chair"
          ? doc.audience.some((a) => ["board", "chair", "user", "guest"].includes(a))
          : role === "user"
            ? doc.audience.some((a) => ["user", "guest"].includes(a))
            : doc.audience.includes("guest");
    const suffix = hasAccess ? "" : " (нужен вход)";
    return {
      type: "link" as const,
      label: `Документ: ${doc.title}${suffix}`,
      href: `/docs/${doc.slug}`,
    };
  });
  return actions;
};

const buildKnowledgeActions = async (query: string): Promise<AssistantAction[]> => {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const articles = await listKnowledgeArticles();
  const scored = articles
    .map((article) => {
      const haystack = `${article.title} ${article.summary} ${article.category} ${
        article.slug
      } ${article.tags.join(" ")}`.toLowerCase();
      const score = tokens.reduce((acc, token) => (haystack.includes(token) ? acc + 1 : acc), 0);
      return { article, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  return scored.map(({ article }) => ({
    type: "link" as const,
    label: `Статья: ${article.title}`,
    href: `/knowledge/${article.slug}`,
  }));
};

const getUsageMode = ({
  role,
  isStaff,
  allowPersonal,
}: {
  role: string;
  isStaff: boolean;
  allowPersonal: boolean;
}): "guest_short" | "verified_clarify" | "staff_checklist" => {
  if (role === "guest") return "guest_short";
  if (isStaff) return "staff_checklist";
  if (allowPersonal) return "verified_clarify";
  return "guest_short";
};

const kvFetch = async (path: string, init?: RequestInit) => {
  if (!KV_URL || !KV_TOKEN) {
    return null;
  }
  const res = await fetch(`${KV_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    return null;
  }
  return res.json() as Promise<{ result?: unknown }>;
};

const cacheGet = async (key: string): Promise<AssistantPayload | null> => {
  const data = await kvFetch(`/get/${encodeURIComponent(key)}`);
  const raw = data?.result;
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as AssistantPayload;
    } catch {
      return null;
    }
  }
  return raw as AssistantPayload;
};

const cacheSet = async (key: string, payload: AssistantPayload) => {
  if (!KV_URL || !KV_TOKEN) return;
  await kvFetch(`/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  await kvFetch(`/expire/${encodeURIComponent(key)}/${CACHE_TTL_SECONDS}`, { method: "POST" });
};

const trimAnswer = (text: string) => {
  if (text.length <= MAX_ANSWER_CHARS) return text;
  return `${text.slice(0, MAX_ANSWER_CHARS).trim()}…`;
};

const matchFaq = (message: string) => {
  const text = message.toLowerCase();
  if (/(доступ|вход|логин|кабинет|код)/i.test(text)) {
    return {
      answer:
        "Доступ в личный кабинет выдаёт правление. Получите код участка и войдите через страницу доступа. Если кода нет, запросите его у правления.",
      links: [
        { label: "Как получить доступ", href: "/access" },
        { label: "Вход в кабинет", href: "/login" },
      ],
    };
  }
  if (/(взнос|оплат|платеж|реквиз|долг)/i.test(text)) {
    return {
      answer:
        "Информация о взносах, сроках оплаты и реквизитах доступна на странице «Взносы и долги».",
      links: [{ label: "Взносы и долги", href: "/fees" }],
    };
  }
  if (/(электр|свет|показан|счётчик|энерг)/i.test(text)) {
    return {
      answer:
        "Передача показаний и информация по электроэнергии описаны в разделе «Электроэнергия».",
      links: [{ label: "Электроэнергия", href: "/electricity" }],
    };
  }
  if (/(документ|устав|протокол|решен)/i.test(text)) {
    return {
      answer:
        "Официальные документы СНТ доступны в разделе «Документы». Там размещены устав, протоколы и шаблоны.",
      links: [{ label: "Документы", href: "/docs" }],
    };
  }
  if (/(обращен|связ|правлен|контакт|телефон|почт)/i.test(text)) {
    return {
      answer:
        "Контакты правления и способы связи размещены на странице «Контакты».",
      links: [{ label: "Контакты", href: "/contacts" }],
    };
  }
  return null;
};

const loadTopicContent = async (topic: Topic): Promise<string> => {
  const fileName = topicFiles[topic];
  const filePath = path.join(process.cwd(), "knowledge", fileName);
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return "Инструкция временно недоступна. Попробуйте позже.";
  }
};

const getLastPeriod = (type: string) =>
  listAccrualPeriods()
    .filter((period) => period.type === type)
    .sort((a, b) => {
      if (a.year === b.year) return b.month - a.month;
      return b.year - a.year;
    })[0];

const formatPeriodLabel = (period: { year: number; month: number }) =>
  `${period.year}-${String(period.month).padStart(2, "0")}`;

const sumPeriod = (periodId: string, type: string) => {
  const items = listAccrualItems(periodId);
  const accrued = items.reduce((sum, item) => sum + item.amountAccrued, 0);
  const paid = listPayments({
    periodId,
    includeVoided: false,
    category: categoryForAccrualType(type),
  }).reduce((sum, payment) => sum + payment.amount, 0);
  return { accrued, paid, debt: accrued - paid, items };
};

const buildStaffBillingCards = (): { cards: ContextCard[]; lastPeriod: string | null; hasData: boolean } => {
  const period = getLastPeriod("membership_fee");
  if (!period) {
    return {
      cards: [
        {
          title: "Биллинг: нет периода",
          lines: ["Создайте период начислений, чтобы увидеть показатели."],
          href: "/admin/billing",
          status: "warning",
        },
      ],
      lastPeriod: null,
      hasData: false,
    };
  }
  const totals = sumPeriod(period.id, "membership_fee");
  const tariff = getMembershipTariffSetting().value;
  const periodLabel = formatPeriodLabel(period);
  return {
    cards: [
      {
        title: `Биллинг: ${periodLabel}`,
        lines: [
          `Тариф: ${tariff.toLocaleString("ru-RU")} ₽/мес`,
          `Начислено: ${totals.accrued.toLocaleString("ru-RU")} ₽`,
          `Оплачено: ${totals.paid.toLocaleString("ru-RU")} ₽`,
          `Долг: ${totals.debt.toLocaleString("ru-RU")} ₽`,
        ],
        href: `/admin/billing?period=${periodLabel}`,
        status: totals.debt > 0 ? "warning" : "success",
      },
    ],
    lastPeriod: periodLabel,
    hasData: totals.items.length > 0,
  };
};

const buildStaffDebtsCards = (): { cards: ContextCard[]; lastPeriod: string | null; hasData: boolean } => {
  const period = getLastPeriod("membership_fee");
  if (!period) {
    return {
      cards: [
        {
          title: "Долги: нет периода",
          lines: ["Добавьте начисления, чтобы увидеть должников."],
          href: "/admin/debts",
          status: "warning",
        },
      ],
      lastPeriod: null,
      hasData: false,
    };
  }
  const totals = sumPeriod(period.id, "membership_fee");
  const payments = listPayments({
    periodId: period.id,
    includeVoided: false,
    category: categoryForAccrualType("membership_fee"),
  });
  const paidByPlot: Record<string, number> = {};
  payments.forEach((payment) => {
    paidByPlot[payment.plotId] = (paidByPlot[payment.plotId] ?? 0) + payment.amount;
  });
  const debtorsCount = totals.items.filter(
    (item) => item.amountAccrued - (paidByPlot[item.plotId] ?? 0) > 0
  ).length;
  const periodLabel = formatPeriodLabel(period);
  return {
    cards: [
      {
        title: `Долги: ${periodLabel}`,
        lines: [
          `Должников: ${debtorsCount}`,
          `Всего долга: ${totals.debt.toLocaleString("ru-RU")} ₽`,
        ],
        href: `/admin/debts?period=${periodLabel}&type=membership`,
        status: totals.debt > 0 ? "warning" : "success",
      },
    ],
    lastPeriod: periodLabel,
    hasData: totals.debt > 0,
  };
};

const buildStaffImportCards = (): { cards: ContextCard[]; hasData: boolean } => {
  const batches = listImportBatches()
    .slice()
    .sort((a, b) => b.importedAt.localeCompare(a.importedAt))
    .slice(0, 3);
  if (batches.length === 0) {
    return {
      cards: [
        {
          title: "Импорты: нет данных",
          lines: ["История импортов появится после загрузки платежей."],
          href: "/admin/billing/imports",
          status: "info",
        },
      ],
      hasData: false,
    };
  }
  return {
    cards: batches.map((batch) => {
      const warningsCount =
        batch.warnings?.reduce((sum, item) => sum + item.count, 0) ?? 0;
      const statusLabel =
        batch.status === "rolled_back" ? "Откачен" : "Завершён";
      return {
        title: batch.fileName ? `Импорт: ${batch.fileName}` : "Импорт платежей",
        lines: [
          `Статус: ${statusLabel}`,
          `Создано: ${batch.createdCount}`,
          `Пропущено: ${batch.skippedCount}`,
          warningsCount ? `Предупреждений: ${warningsCount}` : "Ошибок нет",
        ],
        href: "/admin/billing/imports",
        status: warningsCount ? "warning" : "info",
      };
    }),
    hasData: true,
  };
};

const buildPublicCards = (): ContextCard[] => [
  {
    title: "Помощь",
    lines: ["Ответы на частые вопросы жителей и доступы к кабинету."],
    href: "/help",
    status: "info",
  },
];

const buildOutOfScopeResponse = () => {
  const answer = [
    "Я могу отвечать только по вопросам СНТ «Улыбка» и сайта.",
    "Примеры: доступ и проверка, документы, взносы, электроэнергия, контакты правления.",
    "Можно спросить: «Где найти реквизиты?», «Как передать показания?», «Что говорит 217‑ФЗ?».",
  ].join(" ");
  const links = topicLinks["public-help"];
  return {
    topic: "public-help" as const,
    answer,
    links,
    contextCards: buildPublicCards(),
    actions: links.map((link) => ({ type: "link" as const, label: link.label, href: link.href })),
    drafts: [] as AssistantDraft[],
  };
};

const buildActions = (
  topic: Topic,
  options: { lastPeriod: string | null; hasData: boolean; permissions: RolePermissions },
): AssistantAction[] => {
  if (topic === "staff-billing") {
    if (!options.hasData || !options.lastPeriod) {
      return [{ type: "link", label: "Перейти в биллинг", href: "/admin/billing" }];
    }
    return [
      { type: "link", label: "Открыть биллинг", href: `/admin/billing?period=${options.lastPeriod}` },
      { type: "link", label: "Тарифы взносов", href: "/admin/tariffs" },
    ];
  }
  if (topic === "staff-debts") {
    if (!options.hasData || !options.lastPeriod) {
      return [{ type: "link", label: "Перейти в биллинг", href: "/admin/billing" }];
    }
    return [
      { type: "link", label: "Открыть долги", href: `/admin/debts?period=${options.lastPeriod}&type=membership` },
      {
        type: "link",
        label: "Открыть должников",
        href: `/admin/notifications/debtors?period=${options.lastPeriod}&type=membership`,
      },
    ];
  }
  if (topic === "staff-imports") {
    return [
      { type: "link", label: "Импорт платежей", href: "/admin/billing/import" },
      { type: "link", label: "Журнал импортов", href: "/admin/billing/imports" },
    ];
  }
  return [{ type: "link", label: "Открыть помощь", href: "/help" }];
};

const buildNoDataAnswer = (topic: Topic) => {
  if (topic === "staff-billing") {
    return "Нет данных по начислениям. Создайте период, чтобы увидеть показатели.";
  }
  if (topic === "staff-debts") {
    return "Нет данных по долгам за выбранный период. Проверьте начисления.";
  }
  if (topic === "staff-imports") {
    return "Нет данных по импортам. Загрузите платежи, чтобы появился журнал.";
  }
  return "Нет данных для ответа. Попробуйте уточнить вопрос.";
};

const buildDebtDrafts = ({
  periodLabel,
  totalDebt,
  requisitesText,
}: {
  periodLabel: string;
  totalDebt: number;
  requisitesText: string;
}): AssistantDraft[] => {
  const amountLine =
    totalDebt > 0
      ? `Общая задолженность за ${periodLabel}: ${totalDebt.toLocaleString("ru-RU")} ₽.`
      : `Данные по задолженности за ${periodLabel} уточняются.`;
  const portalLine = "Личный кабинет: /cabinet";
  const requisitesLine = requisitesText.trim().length
    ? `Реквизиты для оплаты: ${requisitesText.trim()}`
    : "Реквизиты уточняйте у правления.";
  return [
    {
      id: "soft",
      title: "Мягко",
      text: [
        "Уважаемые собственники!",
        `Просим проверить оплату взносов за ${periodLabel}.`,
        amountLine,
        portalLine,
        requisitesLine,
        "Спасибо!",
      ].join("\n"),
    },
    {
      id: "official",
      title: "Официально",
      text: [
        `Уведомление СНТ «Улыбка» за период ${periodLabel}.`,
        amountLine,
        portalLine,
        requisitesLine,
        "По вопросам свяжитесь с правлением.",
      ].join("\n"),
    },
    {
      id: "strict",
      title: "Жёстко",
      text: [
        `Просим срочно закрыть задолженность за ${periodLabel}.`,
        amountLine,
        portalLine,
        requisitesLine,
      ].join("\n"),
    },
  ];
};

export async function POST(request: Request) {
  const requestStart = Date.now();
  let success = false;
  let errorMessage: string | null = null;
  let source: AiUsageSource = "assistant";
  let cachedFlag = false;
  let body: AssistantBody;
  try {
    body = (await request.json()) as AssistantBody;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const message = typeof body.message === "string" ? body.message : "";
  const pathHint = body.pageContext?.path ?? null;
  const messageLen = message.trim().length;
  let openAiKey: string;
  try {
    openAiKey = createOpenAIClient((apiKey) => apiKey);
  } catch (error) {
    if (error instanceof OpenAIKeyMissingError) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is missing" },
        { status: 500 },
      );
    }
    throw error;
  }
  const aiSettings = await getAiSettings().catch(() => DEFAULT_AI_SETTINGS);
  const flags = await getFeatureFlags().catch(() => null);
  const rawTopic = inferTopic(message, pathHint);
  let logTopic: string = rawTopic;
  const logOutOfScope = false;
  let logMode: "guest_short" | "verified_clarify" | "staff_checklist" = "guest_short";
  const faqMatch = matchFaq(message);
  if (faqMatch) {
    const faqUser = await getSessionUser();
    const faqUserId = faqUser?.id ?? "guest";
    const faqRole = faqUser?.role ?? "guest";
    const aiSettings = await getAiSettings().catch(() => DEFAULT_AI_SETTINGS);
    const rawHintMode =
      body.hint?.mode === "guest" || body.hint?.mode === "resident" || body.hint?.mode === "staff"
        ? body.hint.mode
        : null;
    const hintMode = staffRoles.has(faqRole)
      ? rawHintMode ?? "staff"
      : faqUser?.status === "verified"
        ? rawHintMode === "resident"
          ? "resident"
          : "guest"
        : "guest";
    const hintVerbosity =
      body.hint?.verbosity === "short" ||
      body.hint?.verbosity === "normal" ||
      body.hint?.verbosity === "long"
        ? body.hint.verbosity
        : hintMode === "staff"
          ? "long"
          : hintMode === "resident"
            ? "normal"
            : "short";
    const hint: AssistantHint = {
      mode: hintMode,
      verbosity: hintVerbosity,
    };
    const allowPersonal = Boolean(
      flags &&
        isFeatureEnabled(flags, "ai_personal_enabled") &&
        faqUser?.status === "verified",
    );
    const usageMode = getUsageMode({
      role: faqRole,
      isStaff: staffRoles.has(faqRole),
      allowPersonal,
    });
    source = "faq";
    cachedFlag = false;
    success = true;
    const answer = trimAnswer(faqMatch.answer);
    const hinted = applyResponseHints(
      {
        topic: "public-help",
        answer,
        links: faqMatch.links,
        contextCards: [],
        actions: faqMatch.links.map((link) => ({ type: "link", label: link.label, href: link.href })),
        drafts: [],
      },
      hint,
    );
    await logAiUsage({
      userId: faqUserId,
      role: faqRole,
      source,
      cached: cachedFlag,
      ts: new Date().toISOString(),
      success: true,
      tokens: null,
      pathHint,
      topic: "public-help",
      mode: usageMode,
      outOfScope: false,
      latencyMs: Date.now() - requestStart,
      messageLen,
      thumb: null,
      error: null,
    });
    return NextResponse.json({
      ok: true,
      ...applyAiSettings(hinted, aiSettings),
      source,
      cached: cachedFlag,
    });
  }

  const sessionUser = await getSessionUser();
  const userId = sessionUser?.id ?? "guest";
  const role = normalizeRole(sessionUser?.role);
  const permissions = getRolePermissions(role);
  const assistantEnabled = flags ? isFeatureEnabled(flags, "ai_widget_enabled") : false;
  const rawHintMode =
    body.hint?.mode === "guest" || body.hint?.mode === "resident" || body.hint?.mode === "staff"
      ? body.hint.mode
      : null;
  const hintMode = staffRoles.has(role)
    ? rawHintMode ?? "staff"
    : sessionUser?.status === "verified"
      ? rawHintMode === "resident"
        ? "resident"
        : "guest"
      : "guest";
  const hintVerbosity =
    body.hint?.verbosity === "short" || body.hint?.verbosity === "normal" || body.hint?.verbosity === "long"
      ? body.hint.verbosity
      : hintMode === "staff"
        ? "long"
        : hintMode === "resident"
          ? "normal"
          : "short";
  const hint: AssistantHint = { mode: hintMode, verbosity: hintVerbosity };

  if (!assistantEnabled) {
    const usageMode = getUsageMode({ role, isStaff: staffRoles.has(role), allowPersonal: false });
    await logAiUsage({
      userId,
      role,
      source,
      cached: false,
      ts: new Date().toISOString(),
      success: false,
      tokens: null,
      pathHint,
      topic: rawTopic,
      mode: usageMode,
      outOfScope: false,
      latencyMs: Date.now() - requestStart,
      messageLen,
      thumb: null,
      error: "AI disabled",
    });
    return NextResponse.json(
      {
        error: "AI not enabled",
        message: "ИИ-помощник временно отключён. Справка доступна.",
      },
      { status: 403 },
    );
  }

  if (isGreeting(message)) {
    const allowPersonal = Boolean(
      flags &&
        isFeatureEnabled(flags, "ai_personal_enabled") &&
        sessionUser?.status === "verified",
    );
    const usageMode = getUsageMode({
      role,
      isStaff: staffRoles.has(role),
      allowPersonal,
    });
    const greetingActions: AssistantAction[] = [];
    if (role === "guest") {
      greetingActions.push(
        { type: "link", label: "Войти", href: "/login" },
        { type: "link", label: "Как получить доступ", href: "/access" },
      );
    } else {
      greetingActions.push(
        { type: "link", label: "Финансы", href: "/cabinet?section=finance" },
        { type: "link", label: "Электроэнергия", href: "/cabinet?section=electricity" },
      );
    }
    greetingActions.push(
      { type: "link", label: "Документы", href: "/docs" },
      { type: "link", label: "Контакты", href: "/contacts" },
    );
    const greetingAnswer = await callOpenAI({
      apiKey: openAiKey,
      system: buildSystemPrompt(
        "Сформируй дружелюбное приветствие и кратко перечисли, с чем ты помогаешь (взносы, электроэнергия, документы, обращения).",
      ),
      user: message,
      temperature: resolveTemperature(aiSettings),
    });
    const greeting = applyAiSettings(
      applyResponseHints(
        {
          topic: "public-help",
          answer: greetingAnswer,
          links: [],
          contextCards: [],
          actions: greetingActions,
          drafts: [],
        },
        hint,
      ),
      aiSettings,
    );
    source = "assistant";
    cachedFlag = false;
    success = true;
    await logAiUsage({
      userId,
      role,
      source,
      cached: cachedFlag,
      ts: new Date().toISOString(),
      success: true,
      tokens: null,
      pathHint,
      topic: "public-help",
      mode: usageMode,
      outOfScope: false,
      latencyMs: Date.now() - requestStart,
      messageLen,
      thumb: null,
      error: null,
    });
    return NextResponse.json({
      ok: true,
      ...greeting,
      cached: cachedFlag,
      source,
    });
  }

  if (!isAllowedTopic(message, pathHint, aiSettings.strictMode)) {
    const allowPersonal = Boolean(
      flags &&
        isFeatureEnabled(flags, "ai_personal_enabled") &&
        sessionUser?.status === "verified",
    );
    const usageMode = getUsageMode({
      role,
      isStaff: staffRoles.has(role),
      allowPersonal,
    });
    const refusal = applyAiSettings(applyResponseHints(buildOutOfScopeResponse(), hint), aiSettings);
    source = "assistant";
    cachedFlag = false;
    success = true;
    await logAiUsage({
      userId,
      role,
      source,
      cached: cachedFlag,
      ts: new Date().toISOString(),
      success: true,
      tokens: null,
      pathHint,
      topic: "public-help",
      mode: usageMode,
      outOfScope: true,
      latencyMs: Date.now() - requestStart,
      messageLen,
      thumb: null,
      error: null,
    });
    return NextResponse.json({
      ok: true,
      ...refusal,
      cached: cachedFlag,
      source,
    });
  }

  const personalEnabled = flags ? isFeatureEnabled(flags, "ai_personal_enabled") : false;
  const isVerifiedUser = sessionUser?.status === "verified";
  const allowPersonal = personalEnabled && isVerifiedUser;
  const isStaff = staffRoles.has(role) && allowPersonal;
  const usageMode = getUsageMode({ role, isStaff, allowPersonal });
  logMode = usageMode;

  const startedAt = new Date();
  try {
    const rate = await enforceAiRateLimit(userId, role, startedAt);
    if (!rate.allowed) {
      await logAiUsage({
        userId,
        role,
        source,
        cached: false,
        ts: startedAt.toISOString(),
        success: false,
        tokens: null,
        pathHint,
        topic: rawTopic,
        mode: usageMode,
        outOfScope: false,
        latencyMs: Date.now() - requestStart,
        messageLen,
        thumb: null,
        error: "Rate limit exceeded",
      });
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    if (process.env.NODE_ENV !== "production") {
      console.warn("[assistant] rate limit failed", error);
    }
    await logAiUsage({
      userId,
      role,
      source,
      cached: false,
      ts: startedAt.toISOString(),
      success: false,
      tokens: null,
      pathHint,
      topic: rawTopic,
      mode: usageMode,
      outOfScope: false,
      latencyMs: Date.now() - requestStart,
      messageLen,
      thumb: null,
      error: msg,
    });
    return NextResponse.json({ error: "AI rate limiter unavailable" }, { status: 500 });
  }

  try {
    const prompt = `${message}|${pathHint ?? ""}|${CONTEXT_VERSION}`;
    const cacheKey = `ai:cache:${userId}:${createHash("sha256").update(prompt).digest("hex")}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      source = "cache";
      cachedFlag = true;
      success = true;
      logTopic = cached.topic;
      return NextResponse.json({
        ok: true,
        ...applyAiSettings(applyResponseHints(cached, hint), aiSettings),
        cached: cachedFlag,
        source,
      });
    }

    const isStaff = staffRoles.has(role) && allowPersonal;
    const rawTopic = inferTopic(message, pathHint);
    const topic: Topic = isStaff ? rawTopic : "public-help";
    logTopic = topic;
    const answerFromFile = await loadTopicContent(topic);
    const links = topicLinks[topic];
    let contextCards: ContextCard[] = [];
    let answer = answerFromFile;
    let actions: AssistantAction[] = [];
    let drafts: AssistantDraft[] = [];

    if (isStaff) {
      if (topic === "staff-billing") {
        const billing = buildStaffBillingCards();
        contextCards = billing.cards;
        actions = buildActions(topic, {
          lastPeriod: billing.lastPeriod,
          hasData: billing.hasData,
          permissions,
        });
        if (!billing.hasData) answer = buildNoDataAnswer(topic);
      } else if (topic === "staff-debts") {
        const debts = buildStaffDebtsCards();
        contextCards = debts.cards;
        actions = buildActions(topic, {
          lastPeriod: debts.lastPeriod,
          hasData: debts.hasData,
          permissions,
        });
        if (!debts.hasData) answer = buildNoDataAnswer(topic);
      } else if (topic === "staff-imports") {
        const imports = buildStaffImportCards();
        contextCards = imports.cards;
        actions = buildActions(topic, {
          lastPeriod: null,
          hasData: imports.hasData,
          permissions,
        });
        if (!imports.hasData) answer = buildNoDataAnswer(topic);
      }
    } else {
      contextCards = buildPublicCards();
      actions = buildActions("public-help", {
        lastPeriod: null,
        hasData: true,
        permissions,
      });
    }
    if (isStaff && (topic === "staff-debts" || topic === "staff-debtors")) {
      const period = getLastPeriod("membership_fee");
      if (period) {
        const totals = sumPeriod(period.id, "membership_fee");
        const periodLabel = formatPeriodLabel(period);
        const publicContent = await getPublicContent();
        const requisitesText = [
          `Получатель: ${publicContent.paymentDetails.receiver}`,
          `ИНН ${publicContent.paymentDetails.inn}`,
          `КПП ${publicContent.paymentDetails.kpp}`,
          `р/с ${publicContent.paymentDetails.account}`,
          publicContent.paymentDetails.bank,
          `БИК ${publicContent.paymentDetails.bic}`,
          `к/с ${publicContent.paymentDetails.corr}`,
        ].join("; ");
        drafts = buildDebtDrafts({
          periodLabel,
          totalDebt: totals.debt,
          requisitesText,
        });
      }
    }

    const contextSummary = [
      answer,
      contextCards.length > 0
        ? `Данные:\n${contextCards
            .map((card) => `- ${card.title}: ${card.lines.join(" ")}`)
            .join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    const userPrompt = pathHint ? `${message}\n\nСтраница: ${pathHint}` : message;
    answer = await callOpenAI({
      apiKey: openAiKey,
      system: buildSystemPrompt(contextSummary),
      user: userPrompt,
      temperature: resolveTemperature(aiSettings),
    });

    const messagePreview = message.slice(0, 120);

    await logAdminAction({
      action: "assistant_query",
      entity: "assistant",
      meta: {
        actorUserId: sessionUser?.id ?? null,
        actorRole: sessionUser?.role ?? role,
        path: pathHint,
        topic,
        hasContextCards: contextCards.length > 0,
        messagePreview,
      },
    });

    success = true;
    const isNavQuery = isNavigationQuery(message);
    const wordCount = message.trim().split(/\s+/).filter(Boolean).length;
    const isShortHint = wordCount > 0 && wordCount <= 6;
    const shouldSuggestKnowledge = isNavQuery || isShortHint;
    const knowledgeActions = shouldSuggestKnowledge ? await buildKnowledgeActions(message) : [];
    const docActions = isNavQuery ? await buildDocActions(message, role) : [];
    const navigationResults = isNavQuery ? searchSiteIndex(message, role) : [];
    const navigationActions = navigationResults.map((item) => ({
      type: "link" as const,
      label: item.title,
      href: item.href,
    }));
    const roleActions = isNavQuery || isShortHint ? buildRoleActions(role) : [];
    const combinedActions = mergeActions(
      mergeActions(
        mergeActions(knowledgeActions, docActions),
        navigationActions,
      ),
      roleActions,
    );
    const payload: AssistantPayload = applyAiSettings(
      applyResponseHints(
        {
          topic,
          answer: trimAnswer(answer),
          links,
          contextCards,
          actions: mergeActions(actions, combinedActions),
          drafts,
        },
        hint,
      ),
      aiSettings,
    );
    await cacheSet(cacheKey, payload);
    source = "assistant";
    cachedFlag = false;
    return NextResponse.json({
      ok: true,
      ...payload,
      cached: cachedFlag,
      source,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    errorMessage = message;
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  } finally {
    await logAiUsage({
      userId,
      role,
      source,
      cached: cachedFlag,
      ts: startedAt.toISOString(),
      success,
      tokens: null,
      pathHint,
      topic: logTopic,
      mode: logMode,
      outOfScope: logOutOfScope,
      latencyMs: Date.now() - requestStart,
      messageLen,
      thumb: null,
      error: success ? null : errorMessage ?? "Unknown error",
    });
  }
}

// Manual tests:
// - Toggle ai_widget_enabled -> widget hidden/visible on public pages.
// - ai_personal_enabled ON + verified -> personal answers; OFF or not verified -> public only.
// - Format settings (style/tone/sources) change response formatting.
