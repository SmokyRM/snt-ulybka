import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
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
import { OpenAIKeyMissingError } from "@/lib/openai.server";

type AssistantBody = {
  message: string;
  pageContext?: { path?: string };
  role?: string;
};

type Topic =
  | "public-help"
  | "staff-billing"
  | "staff-imports"
  | "staff-debts"
  | "staff-debtors";

const staffRoles = new Set(["admin", "board", "accountant", "operator"]);
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

const buildActions = (topic: Topic, options: { lastPeriod: string | null; hasData: boolean }): AssistantAction[] => {
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
  try {
    const body = (await request.json()) as AssistantBody;
    const message = typeof body.message === "string" ? body.message : "";
    const pathHint = body.pageContext?.path ?? null;
    const sessionUser = await getSessionUser();
    const role = sessionUser?.role ?? "member";
    const isStaff = staffRoles.has(role);
    const rawTopic = inferTopic(message, pathHint);
    const topic: Topic = isStaff ? rawTopic : "public-help";
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
        actions = buildActions(topic, { lastPeriod: billing.lastPeriod, hasData: billing.hasData });
        if (!billing.hasData) answer = buildNoDataAnswer(topic);
      } else if (topic === "staff-debts") {
        const debts = buildStaffDebtsCards();
        contextCards = debts.cards;
        actions = buildActions(topic, { lastPeriod: debts.lastPeriod, hasData: debts.hasData });
        if (!debts.hasData) answer = buildNoDataAnswer(topic);
      } else if (topic === "staff-imports") {
        const imports = buildStaffImportCards();
        contextCards = imports.cards;
        actions = buildActions(topic, { lastPeriod: null, hasData: imports.hasData });
        if (!imports.hasData) answer = buildNoDataAnswer(topic);
      }
    } else {
      contextCards = buildPublicCards();
      actions = buildActions("public-help", { lastPeriod: null, hasData: true });
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

    return NextResponse.json({
      ok: true,
      topic,
      answer,
      links,
      contextCards,
      actions,
      drafts,
    });
  } catch (error) {
    if (error instanceof OpenAIKeyMissingError) {
      return NextResponse.json({ error: "OPENAI_API_KEY missing" }, { status: 500 });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
