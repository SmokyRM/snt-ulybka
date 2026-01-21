import { type OwnershipVerification, type UserPlotView } from "@/lib/plots";
import { type UserFinanceInfo } from "@/lib/getUserFinanceInfo";
import { type Charge } from "@/lib/charges";
import { type RequiredDoc } from "@/lib/requiredDocs";
import { type MembershipRecord } from "@/lib/membership";
import { type UserProfile } from "@/lib/userProfiles";
import { type UserEvent } from "@/lib/userEvents";
import { type FinanceHistoryEntry } from "@/lib/financeHistory";

export type QaCabinetMockData = {
  userPlots: UserPlotView[];
  ownershipVerifications: OwnershipVerification[];
  prefs: { userId: string; activePlotId: string | null; updatedAt: string };
  membership: MembershipRecord;
  profile: UserProfile;
  appeals: Array<{ id: string; createdAt: string; status: string; message?: string }>;
  cabinetContext: { hasDebt: boolean; finance: UserFinanceInfo };
  payments: {
    summary: { debt: number; overpay: number; balance: number; lastPayment: string | null };
    accruals: Array<{
      id: string;
      period: string;
      amount: number;
      description: string;
      status: "unpaid" | "paid";
      createdAt: string;
      items?: Array<{ title: string; amount: number }>;
      plotRef?: string;
      dueDate?: string;
      docRef?: string;
    }>;
    payments: Array<{ id: string; date: string; amount: number; method: string; comment?: string | null }>;
  };
  electricity: {
    userId: string;
    plotId: string | null;
    plotNumber: string;
    lastReading: number | null;
    lastReadingDate: string | null;
    debt: number | null;
    notified: boolean;
    notifiedAt: string | null;
  };
  paymentDetails: {
    recipientName: string;
    inn: string;
    kpp: string;
    account: string;
    bank: string;
    bik: string;
    corrAccount: string;
  };
  events: UserEvent[];
  electricityHistory: Array<{ month: string; reading: number; date: string }>;
  financeHistory: FinanceHistoryEntry[];
  requiredDocs: Array<
    RequiredDoc & {
      acked: boolean;
      ackAt: string | null;
    }
  >;
  charges: Charge[];
  decisions: Array<{ id: string; title: string; type?: string; createdAt?: string }>;
  announcements: Array<{ id: string; title: string; body: string; publishedAt: string; isImportant: boolean }>;
};

export function getQaCabinetMockData(): QaCabinetMockData {
  const now = new Date();
  const iso = now.toISOString();
  const plotId = "plot-mock-1";

  const electricityHistory = [
    { month: "2024-04", reading: 1200, date: "2024-04-10T12:00:00.000Z" },
    { month: "2024-05", reading: 1285, date: "2024-05-10T12:00:00.000Z" },
    { month: "2024-06", reading: 1350, date: "2024-06-10T12:00:00.000Z" },
    { month: "2024-07", reading: 1415, date: "2024-07-10T12:00:00.000Z" },
    { month: "2024-08", reading: 1480, date: "2024-08-10T12:00:00.000Z" },
  ];

  const financeHistory = [
    { userId: "mock-user", month: "2024-04", charged: 3200, paid: 3200 },
    { userId: "mock-user", month: "2024-05", charged: 3200, paid: 3000 },
    { userId: "mock-user", month: "2024-06", charged: 3600, paid: 3600 },
    { userId: "mock-user", month: "2024-07", charged: 3600, paid: 0 },
    { userId: "mock-user", month: "2024-08", charged: 4200, paid: 2000 },
  ];

  return {
    userPlots: [
      {
        plotId,
        street: "Центральная",
        plotNumber: "12",
        displayName: "Центральная, 12",
        cadastral: "66:12:345678:12",
        notes: null,
        inviteCode: null,
        inviteCodeHash: null,
        inviteCodeIssuedAt: null,
        codeUsedAt: null,
        ownerUserId: "mock-user",
        status: "VERIFIED",
        proposedChanges: null,
        seedOwnerName: "Иванов И.И.",
        seedPhone: "+79990000000",
        claimedAt: "2024-01-01T10:00:00.000Z",
        verifiedAt: "2024-02-01T10:00:00.000Z",
        verifiedByUserId: "admin",
        delegateUserId: null,
        delegateInvitedAt: null,
        delegateAddedAt: null,
        delegateInviteTokenHash: null,
        delegateInviteExpiresAt: null,
        delegateInviteUsedAt: null,
        lastActionAt: iso,
        lastActionBy: "admin",
        linkStatus: "active",
        ownershipStatus: "verified",
        ownershipProof: {
          type: "extract_egrn",
          note: "Моковый документ",
          verifiedAt: "2024-02-01T10:00:00.000Z",
          verifiedBy: "admin",
        },
        role: "OWNER",
      },
    ],
    ownershipVerifications: [
      {
        id: "mock-verification-1",
        userId: "mock-user",
        cadastralNumber: "66:12:345678:12",
        documentMeta: { name: "extract.pdf", size: 12345, type: "application/pdf", lastModified: null },
        status: "approved",
        createdAt: "2024-01-15T10:00:00.000Z",
        reviewedAt: "2024-02-01T10:00:00.000Z",
        reviewNote: "Документы подтверждены",
      },
    ],
    prefs: { userId: "mock-user", activePlotId: plotId, updatedAt: iso },
    membership: {
      userId: "mock-user",
      status: "member",
      updatedAt: iso,
      updatedBy: "system",
      notes: null,
    },
    profile: {
      userId: "mock-user",
      fullName: "Алексей Смирнов",
      phone: "+7 999 111-22-33",
      email: "mock@example.com",
      cadastralNumbers: ["66:12:345678:12"],
      updatedAt: iso,
      updatedBy: "system",
    },
    appeals: [
      {
        id: "mock-appeal-1",
        createdAt: "2024-05-10T09:00:00.000Z",
        status: "in_progress",
        message: "Прошу проверить состояние дороги у участка.",
      },
      {
        id: "mock-appeal-2",
        createdAt: "2024-06-02T12:30:00.000Z",
        status: "answered",
        message: "Не приходит квитанция. Помогите разобраться.",
      },
      {
        id: "mock-appeal-3",
        createdAt: "2024-07-15T15:00:00.000Z",
        status: "new",
        message: "Просьба организовать вывоз мусора после субботника.",
      },
    ],
    cabinetContext: {
      hasDebt: true,
      finance: {
        membershipDebt: 4200,
        electricityDebt: 1200,
        status: "debt",
      },
    },
    payments: {
      summary: {
        debt: 3200,
        overpay: 0,
        balance: -3200,
        lastPayment: "2024-08-05T12:00:00.000Z",
      },
      accruals: [
        {
          id: "acc-1",
          period: "2024-09",
          amount: 3500,
          description: "Членские взносы",
          status: "unpaid",
          createdAt: "2024-09-01T08:00:00.000Z",
          items: [
            { title: "Содержание общего имущества", amount: 2500 },
            { title: "Благоустройство", amount: 1000 },
          ],
          plotRef: "Участок №12",
          dueDate: "2024-09-25T00:00:00.000Z",
          docRef: "Протокол №5 от 15.08.2024",
        },
        {
          id: "acc-2",
          period: "2024-08",
          amount: 3200,
          description: "Членские взносы",
          status: "paid",
          createdAt: "2024-08-01T08:00:00.000Z",
          items: [{ title: "Членские взносы", amount: 3200 }],
          plotRef: "Участок №12",
          dueDate: "2024-08-25T00:00:00.000Z",
          docRef: "Протокол №4 от 10.07.2024",
        },
        {
          id: "acc-3",
          period: "2024-07",
          amount: 3600,
          description: "Целевые (дорога)",
          status: "paid",
          createdAt: "2024-07-01T08:00:00.000Z",
          items: [
            { title: "Ремонт дороги", amount: 3000 },
            { title: "Организация субботника", amount: 600 },
          ],
          plotRef: "Участок №12",
          dueDate: "2024-07-20T00:00:00.000Z",
          docRef: "Решение правления от 01.07.2024",
        },
      ],
      payments: [
        { id: "pay-1", date: "2024-08-05T12:00:00.000Z", amount: 3200, method: "Банк", comment: "Оплата квитанции 08/2024" },
        { id: "pay-2", date: "2024-07-10T09:00:00.000Z", amount: 3600, method: "Онлайн", comment: "Целевые июль" },
        { id: "pay-3", date: "2024-06-15T14:30:00.000Z", amount: 3200, method: "Касса", comment: null },
      ],
    },
    electricity: {
      userId: "mock-user",
      plotId,
      plotNumber: "12",
      lastReading: 1480,
      lastReadingDate: "2024-08-10T12:00:00.000Z",
      debt: 1200,
      notified: false,
      notifiedAt: null,
    },
    paymentDetails: {
      recipientName: "СНТ «Улыбка»",
      inn: "6600000000",
      kpp: "660001001",
      account: "40702810999999999999",
      bank: "Улыбка Банк",
      bik: "046577999",
      corrAccount: "30101810900000000999",
    },
    events: [
      {
        id: "mock-event-1",
        userId: "mock-user",
        type: "appeal_status",
        title: "Субботник",
        text: "В эту субботу собираемся на уборку территории у пруда.",
        createdAt: "2024-08-05T08:00:00.000Z",
        readAt: null,
      },
      {
        id: "mock-event-2",
        userId: "mock-user",
        type: "finance_changed",
        title: "Оплата взносов",
        text: "Напоминаем о платеже за июль-август.",
        createdAt: "2024-08-08T09:15:00.000Z",
        readAt: null,
      },
    ],
    electricityHistory,
    financeHistory,
    requiredDocs: [
      {
        id: "mock-doc-1",
        title: "Правила проживания",
        url: "https://example.com/rules",
        requiredFor: "all",
        publishedAt: "2024-05-01T00:00:00.000Z",
        acked: true,
        ackAt: "2024-05-02T10:00:00.000Z",
      },
      {
        id: "mock-doc-2",
        title: "Договор энергоснабжения",
        url: "https://example.com/energy",
        requiredFor: "members",
        publishedAt: "2024-06-01T00:00:00.000Z",
        acked: false,
        ackAt: null,
      },
      {
        id: "mock-doc-3",
        title: "Инструкция по передаче показаний",
        url: "https://example.com/manual",
        requiredFor: "all",
        publishedAt: "2024-04-01T00:00:00.000Z",
        acked: false,
        ackAt: null,
      },
      {
        id: "mock-doc-4",
        title: "Безопасность и доступ",
        url: "https://example.com/security",
        requiredFor: "all",
        publishedAt: "2024-07-15T00:00:00.000Z",
        acked: true,
        ackAt: "2024-07-16T08:00:00.000Z",
      },
      {
        id: "mock-doc-5",
        title: "Форма согласия на обработку данных",
        url: "https://example.com/consent",
        requiredFor: "all",
        publishedAt: "2024-08-01T00:00:00.000Z",
        acked: false,
        ackAt: null,
      },
    ],
    charges: [
      {
        id: "charge-1",
        userId: "mock-user",
        plotId,
        type: "membership",
        amount: 3200,
        period: "2024-07",
        createdAt: "2024-07-05T09:00:00.000Z",
        decisionId: "decision-1",
        status: "unpaid",
      },
      {
        id: "charge-2",
        userId: "mock-user",
        plotId,
        type: "target",
        amount: 2500,
        period: "2024-06",
        createdAt: "2024-06-05T09:00:00.000Z",
        decisionId: "decision-2",
        status: "paid",
      },
      {
        id: "charge-3",
        userId: "mock-user",
        plotId,
        type: "electricity",
        amount: 1200,
        period: "2024-08",
        createdAt: "2024-08-05T09:00:00.000Z",
        decisionId: "decision-3",
        status: "unpaid",
      },
    ],
    decisions: [
      { id: "decision-1", title: "Членские взносы 2024" },
      { id: "decision-2", title: "Дорога к озеру" },
      { id: "decision-3", title: "Электроэнергия август" },
    ],
    announcements: [
      {
        id: "ann-1",
        title: "Новая скважина",
        body: "Запускаем бурение новой скважины, следите за обновлениями.",
        publishedAt: "2024-08-01T09:00:00.000Z",
        isImportant: true,
      },
      {
        id: "ann-2",
        title: "График вывоза мусора",
        body: "Обновили расписание вывоза, смотрите на странице экологических инициатив.",
        publishedAt: "2024-07-20T09:00:00.000Z",
        isImportant: false,
      },
      {
        id: "ann-3",
        title: "Встреча правления",
        body: "Приглашаем членов СНТ на встречу в субботу в 12:00.",
        publishedAt: "2024-07-10T09:00:00.000Z",
        isImportant: false,
      },
    ],
  };
}
