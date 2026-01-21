import {
  OwnershipRequest,
  AuditLog,
  SettingEntry,
  Plot,
  PlotOwner,
  RequestStatus,
  User,
  UserStatus,
  EntityVersion,
  ContactsSetting,
  ScheduleSetting,
  Person,
  AccrualPeriod,
  AccrualItem,
  Payment,
  ImportBatch,
  BillingImport,
  BillingImportError,
  RegistryImport,
  AiEvent,
  ElectricityMeter,
  MeterReading,
  ElectricityTariff,
  DebtNotification,
  Expense,
  ExpenseCategory,
  TargetFund,
  UnifiedBillingPeriod,
  PeriodAccrual,
  BillingPeriodStatus,
  FeeTariff,
  FeeTariffOverride,
  FeeTariffType,
  FeeTariffMethod,
  PaymentImport,
  PaymentImportRow,
  DebtRepaymentPlan,
  DebtNotificationTemplate,
  DebtNotificationHistory,
} from "@/types/snt";
import type { Template } from "@/lib/office/types";

export type ActivityLogEntry = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorUserId: string | null; // null для system действий
  actorRole: string | null;
  meta: Record<string, unknown> | null; // JSON метаданные
  createdAt: string;
};

interface MockDb {
  users: User[];
  plots: Plot[];
  ownershipRequests: OwnershipRequest[];
  plotOwners: PlotOwner[];
  auditLogs: AuditLog[];
  activityLogs: ActivityLogEntry[];
  settings: SettingEntry[];
  entityVersions: EntityVersion[];
  persons: Person[];
  accrualPeriods: AccrualPeriod[];
  accrualItems: AccrualItem[];
  unifiedBillingPeriods: UnifiedBillingPeriod[];
  periodAccruals: PeriodAccrual[];
  feeTariffs: FeeTariff[];
  feeTariffOverrides: FeeTariffOverride[];
  paymentImports: PaymentImport[];
  paymentImportRows: PaymentImportRow[];
  debtRepaymentPlans: DebtRepaymentPlan[];
  debtNotificationTemplates: DebtNotificationTemplate[];
  debtNotificationHistory: DebtNotificationHistory[];
  payments: Payment[];
  importBatches: ImportBatch[];
  billingImports: BillingImport[];
  billingImportErrors: BillingImportError[];
  registryImports: RegistryImport[];
  aiEvents: AiEvent[];
  electricityMeters: ElectricityMeter[];
  meterReadings: MeterReading[];
  electricityTariffs: ElectricityTariff[];
  debtNotifications: DebtNotification[];
  expenses: Expense[];
  expenseCategories: ExpenseCategory[];
  targetFunds: TargetFund[];
  templates: Template[]; // Sprint 5.4: шаблоны действий/ответов
}

export type MockDbSnapshot = MockDb;

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const normalizePhone = (value: string) => value.replace(/\D/g, "");
const normalizeIdentifier = (value: string) =>
  value.includes("@") ? normalizeEmail(value) : normalizePhone(value);

const defaultPlots: Plot[] = Array.from({ length: 20 }, (_, idx) => {
  const num = (idx + 1).toString();
  const street = idx < 10 ? "Центральная" : "Лесная";
  const now = new Date().toISOString();
  return {
    id: `plot-${num}`,
    plotId: `plot-${num}`,
    plotNumber: num,
    number: num,
    street,
    status: "active",
    createdAt: now,
    updatedAt: now,
    membershipStatus: "UNKNOWN",
    isConfirmed: false,
    plotCode: `CODE${num.padStart(2, "0")}`,
    ownerUserId: null,
    ownerFullName: null,
    phone: null,
    email: null,
    notes: null,
  };
});

const defaultUsers: User[] = [
  {
    id: "user-admin-root",
    email: "admin@snt.ru",
    fullName: "Администратор СНТ",
    role: "admin",
    status: "verified",
  },
  {
    id: "user-board",
    email: "board@snt.ru",
    fullName: "Правление СНТ",
    role: "board",
    status: "verified",
  },
];

export const getDb = (): MockDb => {
  const g = globalThis as typeof globalThis & { __SNT_DB__?: MockDb };
  if (!g.__SNT_DB__) {
    const now = new Date().toISOString();
    g.__SNT_DB__ = {
      users: [...defaultUsers],
      plots: [...defaultPlots],
      ownershipRequests: [],
      plotOwners: [],
      auditLogs: [],
      activityLogs: [],
      settings: [
        {
          key: "payment_details",
          value: {
            receiver: "СК «Улыбка»",
            inn: "7423007708",
            kpp: "745901001",
            account: "40703810407950000058",
            bank: "ПАО «Челиндбанк»",
            bankInn: "7453002182",
            bic: "047501711",
            corr: "30101810400000000711",
            address: "",
            chairman: "",
            chairmanPhone: "",
            chairmanEmail: "",
          },
          createdAt: now,
          updatedAt: now,
        },
        {
          key: "official_channels",
          value: {
            vk: "https://vk.com/snt_smile?t2fs=07b664f4ccd18da444_3",
            telegram: "https://t.me/snt_smile",
            email: "",
            phone: "",
          },
          createdAt: now,
          updatedAt: now,
        },
        {
          key: "contacts",
          value: {
            phone: "",
            email: "",
            address: "",
          } satisfies ContactsSetting,
          createdAt: now,
          updatedAt: now,
        },
        {
          key: "schedule",
          value: {
            items: [],
          } satisfies ScheduleSetting,
          createdAt: now,
          updatedAt: now,
        },
        {
          key: "membership_monthly_amount",
          value: 5000,
          createdAt: now,
          updatedAt: now,
        },
      ],
      entityVersions: [],
      persons: [],
      accrualPeriods: [],
      accrualItems: [],
      unifiedBillingPeriods: [],
      periodAccruals: [],
      feeTariffs: [],
      feeTariffOverrides: [],
      paymentImports: [],
      paymentImportRows: [],
      debtRepaymentPlans: [],
      debtNotificationTemplates: [],
      debtNotificationHistory: [],
      payments: [],
      importBatches: [],
      billingImports: [],
      billingImportErrors: [],
      registryImports: [],
      aiEvents: [],
      electricityMeters: [],
      meterReadings: [],
      electricityTariffs: [],
      debtNotifications: [],
      expenses: [],
      expenseCategories: [
        {
          id: "cat-roads",
          name: "Дороги",
          description: "Расходы на содержание и ремонт дорог",
          createdAt: now,
          updatedAt: now,
          createdByUserId: null,
        },
        {
          id: "cat-trash",
          name: "Вывоз мусора",
          description: "Расходы на вывоз мусора",
          createdAt: now,
          updatedAt: now,
          createdByUserId: null,
        },
        {
          id: "cat-security",
          name: "Охрана",
          description: "Расходы на охрану территории",
          createdAt: now,
          updatedAt: now,
          createdByUserId: null,
        },
        {
          id: "cat-lighting",
          name: "Освещение",
          description: "Расходы на освещение",
          createdAt: now,
          updatedAt: now,
          createdByUserId: null,
        },
        {
          id: "cat-electricity",
          name: "Электроэнергия",
          description: "Расходы на электроэнергию",
          createdAt: now,
          updatedAt: now,
          createdByUserId: null,
        },
        {
          id: "cat-other",
          name: "Другое",
          description: "Прочие расходы",
          createdAt: now,
          updatedAt: now,
          createdByUserId: null,
        },
      ],
      targetFunds: [],
      templates: [], // Sprint 5.4: шаблоны действий/ответов (инициализируются в templates.store.ts)
    };
  }
  return g.__SNT_DB__ as MockDb;
};

export const setMockDbSnapshot = (snapshot: MockDbSnapshot) => {
  const g = globalThis as typeof globalThis & { __SNT_DB__?: MockDb };
  g.__SNT_DB__ = snapshot;
};

export const getMockDbSnapshot = (): MockDbSnapshot | null => {
  const g = globalThis as typeof globalThis & { __SNT_DB__?: MockDb };
  return g.__SNT_DB__ ?? null;
};

/**
 * Универсальный генератор строковых ID
 * @param prefix - опциональный префикс для ID (по умолчанию "id")
 * @returns уникальный строковый ID в формате: {prefix}-{timestamp}-{random}
 */
export function createId(prefix?: string): string {
  const prefixValue = prefix ?? "id";
  return `${prefixValue}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const findUserByContact = (contact: string) => {
  const db = getDb();
  const normalized = normalizeIdentifier(contact);
  return db.users.find(
    (user) =>
      (user.email && normalizeEmail(user.email) === normalized) ||
      (user.phone && normalizePhone(user.phone) === normalized)
  );
};

export const findUserById = (id: string) => {
  const db = getDb();
  return db.users.find((user) => user.id === id);
};

export const upsertUser = (user: {
  contact: string;
  fullName?: string;
  phone?: string;
  email?: string;
  plotNumber?: string;
  street?: string;
  role?: User["role"];
  status?: UserStatus;
  pendingPersonId?: string | null;
}) => {
  const db = getDb();
  const existing = findUserByContact(user.contact);
  if (existing) {
    const updated: User = {
      ...existing,
      fullName: user.fullName ?? existing.fullName,
      phone: user.phone ?? existing.phone,
      email: user.email ?? existing.email,
      plotNumber: user.plotNumber ?? existing.plotNumber,
      street: user.street ?? existing.street,
      role: user.role ?? existing.role,
      status: user.status ?? existing.status,
      pendingPersonId: user.pendingPersonId !== undefined ? user.pendingPersonId : existing.pendingPersonId,
    };
    db.users = db.users.map((u) => (u.id === existing.id ? updated : u));
    return updated;
  }
  const newUser: User = {
    id: createId("user"),
    fullName: user.fullName,
    phone: user.phone,
    email: user.email,
    plotNumber: user.plotNumber,
    street: user.street,
    role: user.role ?? "user",
    status: user.status ?? "pending",
    pendingPersonId: user.pendingPersonId ?? null,
  };
  db.users.push(newUser);
  return newUser;
};

export const setUserStatus = (id: string, status: UserStatus) => {
  const db = getDb();
  db.users = db.users.map((user) =>
    user.id === id ? { ...user, status } : user
  );
  return db.users.find((user) => user.id === id);
};

export const getUsersByStatus = (status: UserStatus) => {
  const db = getDb();
  return db.users.filter((user) => user.status === status);
};

export const listUsers = (limit = 10) => {
  const db = getDb();
  return db.users.slice(0, Math.max(0, limit));
};

/**
 * Sprint 7.7: Get deterministic mock user ID for a role
 */
export function getMockUserIdByRole(role: "guest" | "resident" | "chairman" | "secretary" | "accountant" | "admin"): string | null {
  const ROLE_USER_ID_MAP: Record<string, string> = {
    admin: "user-admin-root",
    resident: "user-resident-default",
    chairman: "user-chairman-default",
    secretary: "user-secretary-default",
    accountant: "user-accountant-default",
  };
  return ROLE_USER_ID_MAP[role] || null;
}

export const upsertUserById = (input: {
  id: string;
  fullName?: string;
  phone?: string;
  email?: string;
  role?: User["role"];
  status?: UserStatus;
  telegramChatId?: string | null; // Sprint 5.1: Поддержка telegramChatId
}) => {
  const db = getDb();
  const existing = db.users.find((user) => user.id === input.id);
  if (existing) {
    // ВАЖНО: Если role указан явно, используем его (не перезаписываем существующую роль если role не передан)
    // Это гарантирует, что staff/admin роли не перезаписываются при обновлении других полей
    const updated: User = {
      ...existing,
      fullName: input.fullName ?? existing.fullName,
      phone: input.phone ?? existing.phone,
      email: input.email ?? existing.email,
      // Если role явно передан - используем его, иначе сохраняем существующую
      role: input.role !== undefined ? input.role : existing.role,
      status: input.status ?? existing.status,
      // Sprint 5.1: Обновляем telegramChatId если передан
      telegramChatId: input.telegramChatId !== undefined ? input.telegramChatId : existing.telegramChatId,
    };
    db.users = db.users.map((u) => (u.id === updated.id ? updated : u));
    return updated;
  }
  const created: User = {
    id: input.id,
    fullName: input.fullName,
    phone: input.phone,
    email: input.email,
    role: input.role ?? "user",
    status: input.status ?? "pending",
    telegramChatId: input.telegramChatId ?? null, // Sprint 5.1
  };
  db.users.push(created);
  return created;
};

export const getPlots = () => getDb().plots;

export const getPlotByNumber = (plotNumber: string) => {
  const normalized = normalizePhone(plotNumber);
  return getPlots().find((plot) => normalizePhone(plot.plotNumber) === normalized);
};

export const isPlotOccupied = (plotNumber: string) => {
  const db = getDb();
  const normalized = normalizePhone(plotNumber);
  return db.plotOwners.some(
    (owner) => normalizePhone(owner.plotNumber) === normalized
  );
};

export const submitOwnershipRequest = (
  payload: Omit<
    OwnershipRequest,
    "id" | "status" | "createdAt" | "rejectionReason"
  >
) => {
  const db = getDb();
  const plot = getPlotByNumber(payload.plotNumber);
  if (!plot) {
    throw new Error("Указанный участок не найден в реестре.");
  }
  if (isPlotOccupied(payload.plotNumber)) {
    throw new Error("Участок уже подтвержден за другим пользователем.");
  }

  const request: OwnershipRequest = {
    ...payload,
    id: createId("req"),
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };
  db.ownershipRequests.push(request);
  upsertUser({
    contact: payload.email || payload.phone,
    fullName: payload.fullName,
    phone: payload.phone,
    email: payload.email,
  });
  return request;
};

export const getRequests = (status?: RequestStatus) => {
  const db = getDb();
  return status
    ? db.ownershipRequests.filter((req) => req.status === status)
    : db.ownershipRequests;
};

export const getRequestsByIdentifier = (identifier: string) => {
  const db = getDb();
  const normalized = normalizeIdentifier(identifier);
  return db.ownershipRequests.filter((req) => {
    const emailMatch =
      req.email && normalizeEmail(req.email) === normalized;
    const phoneMatch = normalizePhone(req.phone) === normalized;
    return emailMatch || phoneMatch;
  });
};

export const getApprovedForIdentifier = (identifier: string) => {
  const normalized = normalizeIdentifier(identifier);
  const db = getDb();
  const owner = db.plotOwners.find(
    (item) => normalizeIdentifier(item.userIdentifier) === normalized
  );
  if (!owner) return undefined;
  return db.ownershipRequests.find(
    (req) =>
      req.plotNumber === owner.plotNumber && req.status === "APPROVED"
  );
};

export const approveRequest = (id: string) => {
  const db = getDb();
  const target = db.ownershipRequests.find((req) => req.id === id);
  if (!target) return undefined;

  db.ownershipRequests = db.ownershipRequests.map((req) =>
    req.id === id ? { ...req, status: "APPROVED", rejectionReason: undefined } : req
  );
  db.plotOwners = [
    ...db.plotOwners.filter(
      (owner) => normalizePhone(owner.plotNumber) !== normalizePhone(target.plotNumber)
    ),
    {
      id: createId("owner"),
      plotNumber: target.plotNumber,
      userIdentifier: target.email || target.phone,
    },
  ];
  return target;
};

export const rejectRequest = (id: string, reason: string) => {
  const db = getDb();
  const exists = db.ownershipRequests.some((req) => req.id === id);
  if (!exists) return undefined;
  db.ownershipRequests = db.ownershipRequests.map((req) =>
    req.id === id
      ? { ...req, status: "REJECTED", rejectionReason: reason }
      : req
  );
  return db.ownershipRequests.find((req) => req.id === id);
};

export const resetMockDb = () => {
  const g = globalThis as typeof globalThis & { __SNT_DB__?: MockDb };
  const now = new Date().toISOString();
  g.__SNT_DB__ = {
    users: [...defaultUsers],
    plots: [...defaultPlots],
    ownershipRequests: [],
    plotOwners: [],
    auditLogs: [],
    activityLogs: [],
    settings: [
      {
        key: "payment_details",
        value: {
          receiver: "СК «Улыбка»",
          inn: "7423007708",
          kpp: "745901001",
          account: "40703810407950000058",
          bank: "ПАО «Челиндбанк»",
          bankInn: "7453002182",
          bic: "047501711",
          corr: "30101810400000000711",
          address: "",
          chairman: "",
          chairmanPhone: "",
          chairmanEmail: "",
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        key: "official_channels",
        value: {
          vk: "https://vk.com/snt_smile?t2fs=07b664f4ccd18da444_3",
          telegram: "https://t.me/snt_smile",
          email: "",
          phone: "",
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        key: "contacts",
        value: {
          phone: "",
          email: "",
          address: "",
        } satisfies ContactsSetting,
        createdAt: now,
        updatedAt: now,
      },
      {
        key: "schedule",
        value: {
          items: [],
        } satisfies ScheduleSetting,
        createdAt: now,
        updatedAt: now,
      },
      {
        key: "membership_monthly_amount",
        value: 5000,
        createdAt: now,
        updatedAt: now,
      },
    ],
    entityVersions: [],
    persons: [],
    accrualPeriods: [],
    accrualItems: [],
    unifiedBillingPeriods: [],
    periodAccruals: [],
    feeTariffs: [],
    feeTariffOverrides: [],
    paymentImports: [],
    paymentImportRows: [],
    debtRepaymentPlans: [],
    debtNotificationTemplates: [],
    debtNotificationHistory: [],
    payments: [],
    importBatches: [],
    billingImports: [],
    billingImportErrors: [],
    registryImports: [],
    aiEvents: [],
    electricityMeters: [],
    meterReadings: [],
    electricityTariffs: [],
    debtNotifications: [],
    expenses: [],
    expenseCategories: [
      {
        id: "cat-roads",
        name: "Дороги",
        description: "Расходы на содержание и ремонт дорог",
        createdAt: now,
        updatedAt: now,
        createdByUserId: null,
      },
      {
        id: "cat-trash",
        name: "Вывоз мусора",
        description: "Расходы на вывоз мусора",
        createdAt: now,
        updatedAt: now,
        createdByUserId: null,
      },
      {
        id: "cat-security",
        name: "Охрана",
        description: "Расходы на охрану территории",
        createdAt: now,
        updatedAt: now,
        createdByUserId: null,
      },
      {
        id: "cat-lighting",
        name: "Освещение",
        description: "Расходы на освещение",
        createdAt: now,
        updatedAt: now,
        createdByUserId: null,
      },
      {
        id: "cat-electricity",
        name: "Электроэнергия",
        description: "Расходы на электроэнергию",
        createdAt: now,
        updatedAt: now,
        createdByUserId: null,
      },
      {
        id: "cat-other",
        name: "Другое",
        description: "Прочие расходы",
        createdAt: now,
        updatedAt: now,
        createdByUserId: null,
      },
    ],
    targetFunds: [],
    templates: [], // Sprint 5.4: шаблоны действий/ответов (инициализируются в templates.store.ts)
  };
};

export const logAdminAction = (entry: {
  actorUserId: string | null;
  actorRole: User["role"] | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  meta?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
  comment?: string | null;
}) => {
  const db = getDb();
  const log: AuditLog = {
    id: createId("audit"),
    actorUserId: entry.actorUserId ?? null,
    actorRole: entry.actorRole ?? null,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId ?? null,
    before: entry.before,
    after: entry.after,
    meta: entry.meta ?? undefined,
    ip: entry.ip ?? null,
    userAgent: entry.userAgent ?? null,
    comment: entry.comment ?? null,
    createdAt: new Date().toISOString(),
  };
  db.auditLogs.unshift(log);
  if (db.auditLogs.length > 1000) {
    db.auditLogs = db.auditLogs.slice(0, 1000);
  }
  return log;
};

export const listAuditLogs = (filters?: {
  action?: string | null;
  from?: string | null;
  to?: string | null;
  limit?: number;
  entity?: string | null;
  entityId?: string | null;
}) => {
  const db = getDb();
  const { action, from, to, limit = 50, entity, entityId = null } = filters ?? {};
  const fromDate = from ? new Date(from).getTime() : null;
  const toDate = to ? new Date(to).getTime() : null;
  return db.auditLogs
    .filter((log) => {
      if (action && log.action !== action) return false;
      if (entity && log.entity !== entity) return false;
      if (entity && entityId !== null && log.entityId !== entityId) return false;
      const ts = new Date(log.createdAt).getTime();
      if (fromDate && ts < fromDate) return false;
      if (toDate && ts > toDate) return false;
      return true;
    })
    .slice(0, limit);
};

export const listPersons = () => getDb().persons;

export const addPerson = (data: { fullName: string; phone?: string | null; email?: string | null }) => {
  const now = new Date().toISOString();
  const person: Person = {
    id: createId("person"),
    fullName: data.fullName,
    phone: data.phone ?? null,
    email: data.email ?? null,
    createdAt: now,
    updatedAt: now,
  };
  const db = getDb();
  db.persons.push(person);
  return person;
};

export const findPerson = (id: string) => getDb().persons.find((p) => p.id === id) ?? null;

export const linkOwnerToPlot = (plotId: string, personId: string) => {
  const db = getDb();
  const plot = db.plots.find((p) => p.id === plotId);
  const person = db.persons.find((p) => p.id === personId);
  if (!plot || !person) return null;
  db.plotOwners = [
    ...db.plotOwners.filter((po) => po.plotNumber !== plot.plotNumber),
    { id: createId("owner"), plotNumber: plot.plotNumber, userIdentifier: personId },
  ];
  plot.ownerFullName = person.fullName;
  plot.phone = person.phone ?? null;
  plot.email = person.email ?? null;
  plot.updatedAt = new Date().toISOString();
  return { plot, person };
};

export const findPlotById = (id: string) =>
  getDb().plots.find(
    (p) => p.id === id || p.plotId === id || p.plotNumber === id || p.number === id
  ) ?? null;

export const updatePlotStatus = (id: string, patch: Partial<Plot>) => {
  const db = getDb();
  const plot = db.plots.find((p) => p.id === id);
  if (!plot) return null;
  const updated: Plot = {
    ...plot,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  db.plots = db.plots.map((p) => (p.id === id ? updated : p));
  return updated;
};

export const upsertRegistryPlot = (input: {
  id?: string;
  plotDisplay: string;
  cadastral?: string | null;
  seedOwnerName?: string | null;
  seedOwnerPhone?: string | null;
  note?: string | null;
}) => {
  const db = getDb();
  const now = new Date().toISOString();
  const targetId =
    input.id ||
    (input.cadastral
      ? db.plots.find((p) => (p.cadastral || "").toLowerCase() === input.cadastral?.toLowerCase())?.id
      : undefined);
  const existing = targetId ? db.plots.find((p) => p.id === targetId) : null;
  const [street, plotNumber] = (() => {
    const parts = input.plotDisplay.split(",");
    const streetPart = parts[0]?.trim() || input.plotDisplay.trim();
    const numberMatch = input.plotDisplay.match(/(\d+[А-Яа-яA-Za-z\-]*)/);
    return [streetPart, numberMatch ? numberMatch[1] : input.plotDisplay.trim()];
  })();
  const record: Plot = {
    id: existing?.id ?? createId("plot"),
    plotId: existing?.plotId ?? createId("plot"),
    street: existing?.street ?? street,
    plotNumber: existing?.plotNumber ?? plotNumber,
    number: existing?.number ?? plotNumber,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    status: existing?.status ?? "active",
    membershipStatus: existing?.membershipStatus ?? "UNKNOWN",
    isConfirmed: existing?.isConfirmed ?? false,
    ownerFullName: existing?.ownerFullName ?? input.seedOwnerName ?? null,
    phone: existing?.phone ?? input.seedOwnerPhone ?? null,
    email: existing?.email ?? null,
    notes: input.note ?? existing?.notes ?? null,
    cadastral: input.cadastral ?? existing?.cadastral,
    plotCode: existing?.plotCode,
    ownerUserId: existing?.ownerUserId ?? null,
  };
  const existsIdx = db.plots.findIndex((p) => p.id === record.id);
  if (existsIdx === -1) {
    db.plots.push(record);
  } else {
    db.plots[existsIdx] = record;
  }
  return record;
};

export const listPlotsWithFilters = (filters?: {
  query?: string | null;
  street?: string | null;
  membershipStatus?: Plot["membershipStatus"] | null;
  archived?: boolean | null;
  status?: Plot["status"] | null;
  page?: number;
  pageSize?: number;
}) => {
  const {
    query,
    street,
    membershipStatus,
    archived = null,
    status = null,
    page = 1,
    pageSize = 50,
  } = filters ?? {};
  const db = getDb();
  const q = query?.trim().toLowerCase() ?? "";
  const filtered = db.plots.filter((plot) => {
    if (street && plot.street !== street) return false;
    if (membershipStatus && plot.membershipStatus !== membershipStatus) return false;
    if (archived !== null && (plot.status === "archived") !== archived) return false;
    if (status && plot.status !== status) return false;
    if (!q) return true;
    const ownerLink = db.plotOwners.find((po) => po.plotNumber === plot.plotNumber);
    const owner =
      ownerLink && ownerLink.userIdentifier
        ? db.persons.find((p) => p.id === ownerLink.userIdentifier)
        : null;
    const haystack = [
      plot.id,
      plot.plotId,
      plot.street,
      plot.plotNumber,
      plot.ownerFullName ?? "",
      plot.phone ?? "",
      plot.email ?? "",
      plot.cadastral ?? "",
      plot.notes ?? "",
      owner?.fullName ?? "",
      owner?.phone ?? "",
      owner?.email ?? "",
      `Улица ${plot.street}, участок ${plot.plotNumber}`,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
  const statusOrder = (status?: string) => {
    const map: Record<string, number> = { DRAFT: 0, INVITE_READY: 1, CLAIMED: 2, VERIFIED: 3, active: 2, archived: 4 };
    return map[status || ""] ?? 5;
  };
  const sorted = filtered.sort((a, b) => {
    const sa = statusOrder(a.status);
    const sb = statusOrder(b.status);
    if (sa !== sb) return sa - sb;
    const streetCmp = a.street.localeCompare(b.street, "ru");
    if (streetCmp !== 0) return streetCmp;
    return a.plotNumber.localeCompare(b.plotNumber, "ru", { numeric: true });
  });
  const total = sorted.length;
  const start = (page - 1) * pageSize;
  const items = sorted.slice(start, start + pageSize);
  return { total, items, page, pageSize };
};

export const listPlots = (filters?: {
  query?: string | null;
  street?: string | null;
  membershipStatus?: Plot["membershipStatus"] | null;
  archived?: boolean | null;
}) => {
  const { items } = listPlotsWithFilters({
    query: filters?.query ?? null,
    street: filters?.street ?? null,
    membershipStatus: filters?.membershipStatus ?? null,
    archived: filters?.archived ?? null,
    page: 1,
    pageSize: Number.MAX_SAFE_INTEGER,
  });
  return items;
};

export const updatePlotsBulk = (
  ids: string[],
  patch: Partial<Plot>
): { updated: number; plots: Plot[] } => {
  const db = getDb();
  let updatedCount = 0;
  const updatedPlots: Plot[] = [];
  db.plots = db.plots.map((p) => {
    if (!ids.includes(p.id)) return p;
    const next: Plot = { ...p, ...patch, updatedAt: new Date().toISOString() };
    updatedCount += 1;
    updatedPlots.push(next);
    return next;
  });
  return { updated: updatedCount, plots: updatedPlots };
};

// Billing helpers (MVP)
export const listAccrualPeriods = () => getDb().accrualPeriods;

export const createAccrualPeriod = (payload: { year: number; month: number; type: string; title?: string | null }) => {
  const db = getDb();
  const exists = db.accrualPeriods.find(
    (p) => p.year === payload.year && p.month === payload.month && p.type === payload.type
  );
  if (exists) return exists;
  const period: AccrualPeriod = {
    id: createId("period"),
    year: payload.year,
    month: payload.month,
    type: payload.type,
    title: payload.title ?? null,
    createdAt: new Date().toISOString(),
  };
  db.accrualPeriods.push(period);
  // create items for active plots
  const activePlots = db.plots.filter((p) => p.status !== "archived");
  activePlots.forEach((plot) => {
    db.accrualItems.push({
      id: createId("accrual"),
      periodId: period.id,
      plotId: plot.id,
      amountAccrued: 0,
      amountPaid: 0,
      note: null,
      updatedAt: new Date().toISOString(),
    });
  });
  return period;
};

export const listAccrualItems = (periodId: string) => {
  const db = getDb();
  return db.accrualItems.filter((i) => i.periodId === periodId);
};

export const updateAccrualItem = (id: string, patch: Partial<AccrualItem>) => {
  const db = getDb();
  const item = db.accrualItems.find((i) => i.id === id);
  if (!item) return null;
  const updated: AccrualItem = { ...item, ...patch, updatedAt: new Date().toISOString() };
  db.accrualItems = db.accrualItems.map((i) => (i.id === id ? updated : i));
  return updated;
};

export const listPayments = (filters?: {
  periodId?: string;
  plotId?: string;
  includeVoided?: boolean;
  category?: string | null;
}) => {
  const db = getDb();
  return db.payments.filter((p) => {
    if (!filters?.includeVoided && p.isVoided) return false;
    if (filters?.periodId && p.periodId !== filters.periodId) return false;
    if (filters?.plotId && p.plotId !== filters.plotId) return false;
    if (filters?.category && p.category !== filters.category) return false;
    return true;
  });
};

export const addPayment = (data: {
  periodId: string | null;
  plotId: string | null;
  amount: number;
  paidAt?: string;
  method?: string;
  reference?: string | null;
  comment?: string | null;
  createdByUserId: string | null;
  importBatchId?: string | null;
  category?: string | null;
  fingerprint?: string | null;
  targetFundId?: string | null;
}) => {
  const now = new Date().toISOString();
  const payment: Payment = {
    id: createId("pay"),
    periodId: data.periodId || "",
    plotId: data.plotId || "",
    amount: data.amount,
    paidAt: data.paidAt ?? now,
    method: data.method ?? "other",
    reference: data.reference ?? null,
    comment: data.comment ?? null,
    category: data.category ?? null,
  createdByUserId: data.createdByUserId,
  createdAt: now,
  isVoided: false,
  voidReason: null,
  voidedAt: null,
  voidedByUserId: null,
  importBatchId: data.importBatchId ?? null,
  fingerprint: data.fingerprint ?? null,
  targetFundId: data.targetFundId ?? null,
};
  const db = getDb();
  db.payments.push(payment);
  return payment;
};

export const findPaymentById = (id: string) => {
  const db = getDb();
  return db.payments.find((p) => p.id === id) ?? null;
};

export const updatePayment = (id: string, data: {
  targetFundId?: string | null;
}) => {
  const db = getDb();
  const payment = db.payments.find((p) => p.id === id);
  if (!payment) return null;
  const updated: Payment = {
    ...payment,
    targetFundId: data.targetFundId !== undefined ? data.targetFundId : payment.targetFundId,
  };
  db.payments = db.payments.map((p) => (p.id === id ? updated : p));
  return updated;
};

export const voidPayment = (id: string, reason: string | null, voidedBy: string | null) => {
  const db = getDb();
  const payment = db.payments.find((p) => p.id === id);
  if (!payment || payment.isVoided) return null;
  const updated: Payment = {
    ...payment,
    isVoided: true,
    voidReason: reason ?? null,
    voidedAt: new Date().toISOString(),
    voidedByUserId: voidedBy,
  };
  db.payments = db.payments.map((p) => (p.id === id ? updated : p));
  return updated;
};

export const voidPaymentsByBatch = (
  batchId: string,
  reason: string | null,
  voidedBy: string | null
): number => {
  const db = getDb();
  let count = 0;
  db.payments = db.payments.map((p) => {
    if (p.importBatchId === batchId && !p.isVoided) {
      count += 1;
      return {
        ...p,
        isVoided: true,
        voidReason: reason ?? null,
        voidedAt: new Date().toISOString(),
        voidedByUserId: voidedBy,
      };
    }
    return p;
  });
  return count;
};

export const createImportBatch = (payload: {
  fileName?: string | null;
  importedByUserId: string | null;
  totalRows: number;
  comment?: string | null;
}) => {
  const db = getDb();
  const batch: ImportBatch = {
    id: createId("batch"),
    fileName: payload.fileName ?? null,
    importedAt: new Date().toISOString(),
    importedByUserId: payload.importedByUserId,
    totalRows: payload.totalRows,
    createdCount: 0,
    skippedCount: 0,
    comment: payload.comment ?? null,
    status: "completed",
    rollbackAt: null,
    warnings: null,
  };
  db.importBatches.unshift(batch);
  return batch;
};

export const updateImportBatch = (id: string, patch: Partial<ImportBatch>) => {
  const db = getDb();
  const batch = db.importBatches.find((b) => b.id === id);
  if (!batch) return null;
  const updated = { ...batch, ...patch } as ImportBatch;
  db.importBatches = db.importBatches.map((b) => (b.id === id ? updated : b));
  return updated;
};

export const listImportBatches = () => getDb().importBatches;
export const findImportBatch = (id: string) => getDb().importBatches.find((b) => b.id === id) ?? null;

export const createBillingImport = (payload: {
  batchId: string;
  createdByUserId: string | null;
  fileName?: string | null;
  comment?: string | null;
  totals: {
    total: number;
    valid: number;
    invalid: number;
    unmatched: number;
    duplicates: number;
  };
  warnings?: string[] | null;
}) => {
  const db = getDb();
  const billingImport: BillingImport = {
    id: createId("billing-import"),
    batchId: payload.batchId,
    createdAt: new Date().toISOString(),
    createdByUserId: payload.createdByUserId,
    fileName: payload.fileName ?? null,
    comment: payload.comment ?? null,
    totals: payload.totals,
    status: "completed",
    warnings: payload.warnings ?? null,
    cancelledAt: null,
  };
  db.billingImports.unshift(billingImport);
  return billingImport;
};

export const updateBillingImport = (id: string, patch: Partial<BillingImport>) => {
  const db = getDb();
  const existing = db.billingImports.find((item) => item.id === id);
  if (!existing) return null;
  const updated: BillingImport = {
    ...existing,
    ...patch,
  };
  db.billingImports = db.billingImports.map((item) => (item.id === id ? updated : item));
  return updated;
};

export const listBillingImports = () => getDb().billingImports;
export const findBillingImport = (id: string) => getDb().billingImports.find((item) => item.id === id) ?? null;
export const findBillingImportByBatch = (batchId: string) =>
  getDb().billingImports.find((item) => item.batchId === batchId) ?? null;

export const createRegistryImport = (payload: {
  userId: string | null;
  fileName: string | null;
  summary: string;
  errorsCount: number;
}) => {
  const db = getDb();
  const registryImport: RegistryImport = {
    id: createId("registry-import"),
    createdAt: new Date().toISOString(),
    userId: payload.userId,
    fileName: payload.fileName,
    summary: payload.summary,
    errorsCount: payload.errorsCount,
  };
  db.registryImports.unshift(registryImport);
  return registryImport;
};

export const listRegistryImports = (): RegistryImport[] => {
  const db = getDb();
  // Ensure we always return an array, even if registryImports is undefined
  return Array.isArray(db.registryImports) ? db.registryImports : [];
};
export const findRegistryImport = (id: string) => {
  const imports = listRegistryImports();
  return imports.find((item) => item.id === id) ?? null;
};

export const createAiEvent = (payload: {
  userId: string | null;
  role: string | null;
  route: string | null;
  eventType: "assistant_opened" | "question_asked" | "answer_shown";
  meta?: Record<string, unknown> | null;
}) => {
  const db = getDb();
  const event: AiEvent = {
    id: createId("ai-event"),
    createdAt: new Date().toISOString(),
    userId: payload.userId,
    role: payload.role,
    route: payload.route,
    eventType: payload.eventType,
    meta: payload.meta || null,
  };
  db.aiEvents.unshift(event);
  // Keep only last 10000 events
  if (db.aiEvents.length > 10000) {
    db.aiEvents = db.aiEvents.slice(0, 10000);
  }
  return event;
};

export const listAiEvents = (filters?: {
  from?: string | null;
  to?: string | null;
  eventType?: AiEvent["eventType"] | null;
  role?: string | null;
}) => {
  const db = getDb();
  let filtered = db.aiEvents;
  const { from, to, eventType, role } = filters || {};
  if (from) {
    const fromDate = new Date(from).getTime();
    filtered = filtered.filter((e) => new Date(e.createdAt).getTime() >= fromDate);
  }
  if (to) {
    const toDate = new Date(to).getTime();
    filtered = filtered.filter((e) => new Date(e.createdAt).getTime() <= toDate);
  }
  if (eventType) {
    filtered = filtered.filter((e) => e.eventType === eventType);
  }
  if (role) {
    filtered = filtered.filter((e) => e.role === role);
  }
  return filtered;
};

export const addBillingImportError = (payload: {
  billingImportId: string;
  rowIndex: number;
  type: BillingImportError["type"];
  reason: string;
  rowText: string;
}) => {
  const db = getDb();
  const error: BillingImportError = {
    id: createId("billing-import-error"),
    billingImportId: payload.billingImportId,
    rowIndex: payload.rowIndex,
    type: payload.type,
    reason: payload.reason,
    rowText: payload.rowText,
    createdAt: new Date().toISOString(),
  };
  db.billingImportErrors.unshift(error);
  return error;
};

export const listBillingImportErrors = (billingImportId: string) =>
  getDb().billingImportErrors.filter((error) => error.billingImportId === billingImportId);

// Electricity meters & readings
export const createMeter = (data: { plotId: string; meterNumber?: string | null; installedAt?: string | null }) => {
  const db = getDb();
  db.electricityMeters = db.electricityMeters.map((m) =>
    m.plotId === data.plotId && m.active ? { ...m, active: false } : m
  );
  const meter: ElectricityMeter = {
    id: createId("meter"),
    plotId: data.plotId,
    meterNumber: data.meterNumber ?? null,
    installedAt: data.installedAt ?? null,
    active: true,
    createdAt: new Date().toISOString(),
  };
  db.electricityMeters.push(meter);
  return meter;
};

export const listMetersByPlot = (plotId: string) =>
  getDb().electricityMeters.filter((m) => m.plotId === plotId);

export const listAllMeters = () => getDb().electricityMeters;

export const addMeterReading = (data: {
  meterId: string;
  readingDate: string;
  value: number;
  source: "manual_admin" | "import" | "owner";
  createdByUserId?: string | null;
}) => {
  const db = getDb();
  const readings = db.meterReadings
    .filter((r) => r.meterId === data.meterId)
    .sort((a, b) => a.readingDate.localeCompare(b.readingDate));
  const last = readings[readings.length - 1];
  if (last && data.value < last.value) {
    throw new Error("Новое показание меньше предыдущего");
  }
  const reading: MeterReading = {
    id: createId("read"),
    meterId: data.meterId,
    readingDate: data.readingDate,
    value: data.value,
    source: data.source,
    createdAt: new Date().toISOString(),
    createdByUserId: data.createdByUserId ?? null,
  };
  db.meterReadings.push(reading);
  return reading;
};

export const listMeterReadings = (meterId: string) =>
  getDb().meterReadings.filter((r) => r.meterId === meterId).sort((a, b) => a.readingDate.localeCompare(b.readingDate));

export const getLastMeterReading = (meterId: string) => {
  const readings = listMeterReadings(meterId);
  return readings[readings.length - 1] ?? null;
};

const getLastReadingOnOrBefore = (meterId: string, dateIso: string) => {
  const limit = new Date(dateIso).getTime();
  return listMeterReadings(meterId)
    .filter((r) => new Date(r.readingDate).getTime() <= limit)
    .sort((a, b) => a.readingDate.localeCompare(b.readingDate))
    .pop() ?? null;
};

export const listElectricityTariffs = () => getDb().electricityTariffs;

export const addElectricityTariff = (data: { pricePerKwh: number; validFrom: string }) => {
  const db = getDb();
  const tariff: ElectricityTariff = {
    id: createId("tariff"),
    pricePerKwh: data.pricePerKwh,
    validFrom: data.validFrom,
    createdAt: new Date().toISOString(),
  };
  db.electricityTariffs.push(tariff);
  db.electricityTariffs.sort(
    (a, b) => new Date(b.validFrom).getTime() - new Date(a.validFrom).getTime()
  );
  return tariff;
};

export const findTariffForPeriod = (year: number, month: number) => {
  const endOfMonth = new Date(Date.UTC(year, month, 0));
  return listElectricityTariffs().find(
    (t) => new Date(t.validFrom).getTime() <= endOfMonth.getTime()
  ) ?? null;
};

export const accrueElectricityForPeriod = (payload: { year: number; month: number }) => {
  const { year, month } = payload;
  const db = getDb();
  const period = createAccrualPeriod({ year, month, type: "electricity" });
  const tariff = findTariffForPeriod(year, month);
  if (!tariff) {
    throw new Error("Нет тарифа для указанного периода");
  }
  const endOfMonth = new Date(Date.UTC(year, month, 0));
  const endOfPrev = new Date(Date.UTC(year, month - 1, 0));
  const activeMeters = db.electricityMeters.filter((m) => m.active);

  const deltasByPlot: Record<string, { delta: number; details: Array<{ meterId: string; delta: number }> }> = {};

  activeMeters.forEach((meter) => {
    const current = getLastReadingOnOrBefore(meter.id, endOfMonth.toISOString());
    if (!current) return;
    const prev = getLastReadingOnOrBefore(meter.id, endOfPrev.toISOString());
    const delta = prev ? current.value - prev.value : current.value;
    if (delta < 0) return;
    if (!deltasByPlot[meter.plotId]) {
      deltasByPlot[meter.plotId] = { delta: 0, details: [] };
    }
    deltasByPlot[meter.plotId].delta += delta;
    deltasByPlot[meter.plotId].details.push({ meterId: meter.id, delta });
  });

  const updatedItems: AccrualItem[] = [];
  Object.entries(deltasByPlot).forEach(([plotId, info]) => {
    const item = ensureAccrualItem(period.id, plotId);
    const updated: AccrualItem = {
      ...item,
      amountAccrued: info.delta * tariff.pricePerKwh,
      note: `ΔкВт=${info.delta}, тариф=${tariff.pricePerKwh}`,
      updatedAt: new Date().toISOString(),
    };
    db.accrualItems = db.accrualItems.map((i) => (i.id === item.id ? updated : i));
    updatedItems.push(updated);
  });

  return {
    period,
    tariff,
    updatedCount: updatedItems.length,
    deltasByPlot,
  };
};

export const getElectricityReport = (year: number, month: number) => {
  const db = getDb();
  const period = findAccrualPeriod(year, month, "electricity");
  const paymentsByPlot: Record<string, number> = {};
  if (period) {
    listPayments({ periodId: period.id, includeVoided: false, category: "electricity" }).forEach((p) => {
      paymentsByPlot[p.plotId] = (paymentsByPlot[p.plotId] ?? 0) + p.amount;
    });
  }
  const accruals = period ? listAccrualItems(period.id) : [];
  const accrualMap: Record<string, AccrualItem> = {};
  accruals.forEach((a) => {
    accrualMap[a.plotId] = a;
  });
  const parseDelta = (note?: string | null) => {
    if (!note) return 0;
    const m = note.match(/ΔкВт\s*=\s*([0-9]+(?:[.,][0-9]+)?)/i);
    if (m && m[1]) {
      const v = Number(m[1].replace(",", "."));
      return Number.isFinite(v) ? v : 0;
    }
    return 0;
  };

  return db.plots.map((plot) => {
    const accrual = accrualMap[plot.id];
    const amountAccrued = accrual?.amountAccrued ?? 0;
    const amountPaid = paymentsByPlot[plot.id] ?? 0;
    const deltaKwh = accrual ? parseDelta(accrual.note) : 0;
    return {
      plotId: plot.id,
      street: plot.street,
      number: plot.plotNumber,
      deltaKwh,
      amountAccrued,
      amountPaid,
      debt: amountAccrued - amountPaid,
    };
  });
};

// Debt notifications
export const upsertDebtNotification = (data: {
  plotId: string;
  periodId: string;
  type: DebtNotification["type"];
  debtAmount: number;
  status: DebtNotification["status"];
  comment?: string | null;
  createdByUserId: string | null;
}) => {
  const db = getDb();
  const existing = db.debtNotifications.find(
    (n) => n.plotId === data.plotId && n.periodId === data.periodId && n.type === data.type
  );
  const now = new Date().toISOString();
  if (existing) {
    const updated: DebtNotification = {
      ...existing,
      debtAmount: data.debtAmount,
      status: data.status,
      comment: data.comment ?? existing.comment ?? null,
      updatedAt: now,
    };
    db.debtNotifications = db.debtNotifications.map((n) => (n.id === existing.id ? updated : n));
    return updated;
  }
  const created: DebtNotification = {
    id: createId("debt"),
    plotId: data.plotId,
    periodId: data.periodId,
    type: data.type,
    debtAmount: data.debtAmount,
    status: data.status,
    comment: data.comment ?? null,
    createdByUserId: data.createdByUserId,
    createdAt: now,
    updatedAt: now,
  };
  db.debtNotifications.push(created);
  return created;
};

export const listDebtNotifications = (filters: { periodId: string; type: DebtNotification["type"] }) => {
  const db = getDb();
  return db.debtNotifications.filter((n) => n.periodId === filters.periodId && n.type === filters.type);
};

export const listDebtNotificationsByPlot = (plotId: string) => {
  const db = getDb();
  return db.debtNotifications.filter((n) => n.plotId === plotId);
};

// Expenses
// Expense Categories
export const listExpenseCategories = () => {
  const db = getDb();
  return [...db.expenseCategories].sort((a, b) => a.name.localeCompare(b.name));
};

export const findExpenseCategoryById = (id: string) => {
  const db = getDb();
  return db.expenseCategories.find((c) => c.id === id) ?? null;
};

export const createExpenseCategory = (data: {
  name: string;
  description?: string | null;
  createdByUserId: string | null;
}) => {
  const now = new Date().toISOString();
  const category: ExpenseCategory = {
    id: createId("exp-cat"),
    name: data.name.trim(),
    description: data.description?.trim() ?? null,
    createdAt: now,
    updatedAt: now,
    createdByUserId: data.createdByUserId,
  };
  const db = getDb();
  db.expenseCategories.push(category);
  return category;
};

export const updateExpenseCategory = (id: string, data: {
  name?: string;
  description?: string | null;
  updatedByUserId: string | null;
}) => {
  const db = getDb();
  const category = db.expenseCategories.find((c) => c.id === id);
  if (!category) return null;
  if (data.name !== undefined) category.name = data.name.trim();
  if (data.description !== undefined) category.description = data.description?.trim() ?? null;
  category.updatedAt = new Date().toISOString();
  category.updatedByUserId = data.updatedByUserId;
  return category;
};

export const deleteExpenseCategory = (id: string) => {
  const db = getDb();
  const idx = db.expenseCategories.findIndex((c) => c.id === id);
  if (idx === -1) return false;
  db.expenseCategories.splice(idx, 1);
  return true;
};

export const addExpense = (data: {
  date: string;
  amount: number;
  categoryId: string;
  description: string;
  vendor?: string | null;
  targetFundId?: string | null;
  attachment?: Expense["attachment"] | null;
  createdByUserId: string | null;
}) => {
  const now = new Date().toISOString();
  const expense: Expense = {
    id: createId("exp"),
    date: data.date,
    amount: data.amount,
    categoryId: data.categoryId,
    description: data.description,
    vendor: data.vendor ?? null,
    targetFundId: data.targetFundId ?? null,
    attachment: data.attachment ?? null,
    createdAt: now,
    createdByUserId: data.createdByUserId,
  };
  const db = getDb();
  db.expenses.unshift(expense);
  return expense;
};

export const updateExpense = (id: string, data: {
  date?: string;
  amount?: number;
  categoryId?: string;
  description?: string;
  vendor?: string | null;
  targetFundId?: string | null;
  attachment?: Expense["attachment"] | null;
  updatedByUserId: string | null;
}) => {
  const db = getDb();
  const expense = db.expenses.find((e) => e.id === id);
  if (!expense) return null;
  if (data.date !== undefined) expense.date = data.date;
  if (data.amount !== undefined) expense.amount = data.amount;
  if (data.categoryId !== undefined) expense.categoryId = data.categoryId;
  if (data.description !== undefined) expense.description = data.description;
  if (data.vendor !== undefined) expense.vendor = data.vendor;
  if (data.targetFundId !== undefined) expense.targetFundId = data.targetFundId;
  if (data.attachment !== undefined) expense.attachment = data.attachment;
  expense.updatedAt = new Date().toISOString();
  expense.updatedByUserId = data.updatedByUserId;
  return expense;
};

export const listExpenses = (filters?: { from?: string | null; to?: string | null; categoryId?: string | null }) => {
  const db = getDb();
  const fromTs = filters?.from ? new Date(filters.from).getTime() : null;
  const toTs = filters?.to ? new Date(filters.to).getTime() : null;
  return db.expenses.filter((e) => {
    const ts = new Date(e.date).getTime();
    if (fromTs && ts < fromTs) return false;
    if (toTs && ts > toTs) return false;
    if (filters?.categoryId && e.categoryId !== filters.categoryId) return false;
    return true;
  });
};

// Target funds
export const addTargetFund = (data: {
  title: string;
  description: string;
  targetAmount: number;
  deadline?: string | null;
  status?: TargetFund["status"];
  aliases?: string[] | null;
  createdByUserId?: string | null;
}) => {
  const now = new Date().toISOString();
  const fund: TargetFund = {
    id: createId("fund"),
    title: data.title,
    description: data.description,
    targetAmount: data.targetAmount,
    deadline: data.deadline || null,
    status: data.status ?? "active",
    createdAt: now,
    updatedAt: now,
    createdByUserId: data.createdByUserId ?? null,
    aliases: data.aliases ?? [],
  };
  const db = getDb();
  db.targetFunds.unshift(fund);
  return fund;
};

export const updateTargetFund = (id: string, data: {
  title?: string;
  description?: string;
  targetAmount?: number;
  deadline?: string | null;
  status?: TargetFund["status"];
  aliases?: string[] | null;
  updatedByUserId?: string | null;
}) => {
  const db = getDb();
  const fund = db.targetFunds.find((f) => f.id === id);
  if (!fund) return null;
  if (data.title !== undefined) fund.title = data.title;
  if (data.description !== undefined) fund.description = data.description;
  if (data.targetAmount !== undefined) fund.targetAmount = data.targetAmount;
  if (data.deadline !== undefined) fund.deadline = data.deadline;
  if (data.status !== undefined) fund.status = data.status;
  if (data.aliases !== undefined) fund.aliases = data.aliases ?? [];
  fund.updatedAt = new Date().toISOString();
  fund.updatedByUserId = data.updatedByUserId ?? null;
  return fund;
};

export const listTargetFunds = () => getDb().targetFunds;
export const findTargetFundById = (id: string) => getDb().targetFunds.find((f) => f.id === id) ?? null;
export const findAccrualPeriod = (year: number, month: number, type: string) => {
  const db = getDb();
  return db.accrualPeriods.find((p) => p.year === year && p.month === month && p.type === type) ?? null;
};

export const ensureAccrualItem = (periodId: string, plotId: string) => {
  const db = getDb();
  const existing = db.accrualItems.find((i) => i.periodId === periodId && i.plotId === plotId);
  if (existing) return existing;
  const created: AccrualItem = {
    id: createId("accrual"),
    periodId,
    plotId,
    amountAccrued: 0,
    amountPaid: 0,
    note: null,
    updatedAt: new Date().toISOString(),
  };
  db.accrualItems.push(created);
  return created;
};

export const getSetting = <T = unknown>(key: string): SettingEntry<T> | null => {
  const db = getDb();
  const found = db.settings.find((s) => s.key === key);
  return (found as SettingEntry<T> | undefined) ?? null;
};

export const setSetting = <T = unknown>(key: string, value: T): SettingEntry<T> => {
  const db = getDb();
  const existing = db.settings.find((s) => s.key === key);
  const now = new Date().toISOString();
  if (existing) {
    const updated: SettingEntry<T> = {
      ...existing,
      value,
      updatedAt: now,
    };
    db.settings = db.settings.map((s) => (s.key === key ? (updated as SettingEntry) : s));
    return updated;
  }
  const created: SettingEntry<T> = {
    key,
    value,
    createdAt: now,
    updatedAt: now,
  };
  db.settings.push(created as SettingEntry);
  return created;
};

export const addEntityVersion = (entry: {
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  actorUserId?: string | null;
  comment?: string | null;
}) => {
  const db = getDb();
  const versionsForEntity = db.entityVersions.filter(
    (v) => v.entity === entry.entity && v.entityId === (entry.entityId ?? null)
  );
  const nextVersion = versionsForEntity.length
    ? Math.max(...versionsForEntity.map((v) => v.version)) + 1
    : 1;
  const version: EntityVersion = {
    id: createId("ver"),
    entity: entry.entity,
    entityId: entry.entityId ?? null,
    version: nextVersion,
    before: entry.before ?? null,
    after: entry.after ?? null,
    actorUserId: entry.actorUserId ?? null,
    createdAt: new Date().toISOString(),
    comment: entry.comment ?? null,
  };
  db.entityVersions.unshift(version);
  if (db.entityVersions.length > 1000) {
    db.entityVersions = db.entityVersions.slice(0, 1000);
  }
  return version;
};

export const listEntityVersions = (filters: {
  entity: string;
  entityId?: string | null;
  limit?: number;
}) => {
  const db = getDb();
  const { entity, entityId = null, limit = 50 } = filters;
  return db.entityVersions
    .filter((v) => v.entity === entity && v.entityId === entityId)
    .slice(0, limit);
};

export const getEntityVersionById = (id: string): EntityVersion | null => {
  const db = getDb();
  return db.entityVersions.find((v) => v.id === id) ?? null;
};

// Unified Billing Periods
export const listUnifiedBillingPeriods = () => {
  const db = getDb();
  return [...db.unifiedBillingPeriods].sort((a, b) => b.from.localeCompare(a.from));
};

export const findUnifiedBillingPeriodById = (id: string): UnifiedBillingPeriod | null => {
  const db = getDb();
  return db.unifiedBillingPeriods.find((p) => p.id === id) ?? null;
};

export const createUnifiedBillingPeriod = (data: {
  from: string;
  to: string;
  status?: BillingPeriodStatus;
  title?: string | null;
  createdByUserId?: string | null;
}): UnifiedBillingPeriod => {
  const db = getDb();
  const now = new Date().toISOString();
  const period: UnifiedBillingPeriod = {
    id: createId("ubp"),
    from: data.from,
    to: data.to,
    status: data.status ?? "draft",
    title: data.title ?? null,
    createdAt: now,
    updatedAt: now,
    createdByUserId: data.createdByUserId ?? null,
    updatedByUserId: null,
  };
  db.unifiedBillingPeriods.push(period);
  return period;
};

export const updateUnifiedBillingPeriod = (
  id: string,
  data: {
    from?: string;
    to?: string;
    status?: BillingPeriodStatus;
    title?: string | null;
    updatedByUserId?: string | null;
  }
): UnifiedBillingPeriod | null => {
  const db = getDb();
  const period = db.unifiedBillingPeriods.find((p) => p.id === id);
  if (!period) return null;
  const updated: UnifiedBillingPeriod = {
    ...period,
    ...data,
    updatedAt: new Date().toISOString(),
    updatedByUserId: data.updatedByUserId ?? period.updatedByUserId,
  };
  db.unifiedBillingPeriods = db.unifiedBillingPeriods.map((p) => (p.id === id ? updated : p));
  return updated;
};

export const listPeriodAccruals = (periodId: string, filters?: { type?: "membership" | "target" | "electric" }) => {
  const db = getDb();
  let items = db.periodAccruals.filter((a) => a.periodId === periodId);
  if (filters?.type) {
    items = items.filter((a) => a.type === filters.type);
  }
  return items;
};

export const findPeriodAccrual = (
  periodId: string,
  plotId: string,
  type: "membership" | "target" | "electric"
): PeriodAccrual | null => {
  const db = getDb();
  return db.periodAccruals.find((a) => a.periodId === periodId && a.plotId === plotId && a.type === type) ?? null;
};

export const ensurePeriodAccrual = (
  periodId: string,
  plotId: string,
  type: "membership" | "target" | "electric"
): PeriodAccrual => {
  const db = getDb();
  const existing = findPeriodAccrual(periodId, plotId, type);
  if (existing) return existing;
  const now = new Date().toISOString();
  const accrual: PeriodAccrual = {
    id: createId("pacc"),
    periodId,
    plotId,
    type,
    amountAccrued: 0,
    amountPaid: 0,
    note: null,
    createdAt: now,
    updatedAt: now,
  };
  db.periodAccruals.push(accrual);
  return accrual;
};

export const updatePeriodAccrual = (
  id: string,
  data: {
    amountAccrued?: number;
    amountPaid?: number;
    overrideApplied?: boolean | null;
    note?: string | null;
  }
): PeriodAccrual | null => {
  const db = getDb();
  const accrual = db.periodAccruals.find((a) => a.id === id);
  if (!accrual) return null;
  const updated: PeriodAccrual = {
    ...accrual,
    ...data,
    updatedAt: new Date().toISOString(),
  };
  db.periodAccruals = db.periodAccruals.map((a) => (a.id === id ? updated : a));
  return updated;
};

// Fee Tariffs
export const listFeeTariffs = (filters?: {
  type?: FeeTariffType | null;
  activeAt?: string | null; // YYYY-MM-DD
}) => {
  const db = getDb();
  let result = [...db.feeTariffs];
  if (filters?.type) {
    result = result.filter((t) => t.type === filters.type);
  }
  if (filters?.activeAt) {
    const activeAt = filters.activeAt;
    result = result.filter((t) => {
      if (t.activeFrom > activeAt) return false;
      if (t.activeTo && t.activeTo < activeAt) return false;
      return true;
    });
  }
  return result.sort((a, b) => b.activeFrom.localeCompare(a.activeFrom));
};

export const findFeeTariffById = (id: string): FeeTariff | null => {
  const db = getDb();
  return db.feeTariffs.find((t) => t.id === id) ?? null;
};

export const createFeeTariff = (data: {
  type: FeeTariffType;
  method: FeeTariffMethod;
  amount: number;
  activeFrom: string;
  activeTo?: string | null;
  title?: string | null;
  status?: "active" | "draft" | null;
  createdByUserId?: string | null;
}): FeeTariff => {
  const db = getDb();
  const now = new Date().toISOString();
  const tariff: FeeTariff = {
    id: createId("ftariff"),
    type: data.type,
    method: data.method,
    amount: data.amount,
    activeFrom: data.activeFrom,
    activeTo: data.activeTo ?? null,
    title: data.title ?? null,
    status: data.status ?? "active",
    createdAt: now,
    updatedAt: now,
    createdByUserId: data.createdByUserId ?? null,
    updatedByUserId: null,
  };
  db.feeTariffs.push(tariff);
  return tariff;
};

export const updateFeeTariff = (
  id: string,
  data: {
    type?: FeeTariffType;
    method?: FeeTariffMethod;
    amount?: number;
    activeFrom?: string;
    activeTo?: string | null;
    title?: string | null;
    status?: "active" | "draft" | null;
    updatedByUserId?: string | null;
  }
): FeeTariff | null => {
  const db = getDb();
  const tariff = db.feeTariffs.find((t) => t.id === id);
  if (!tariff) return null;
  const updated: FeeTariff = {
    ...tariff,
    ...data,
    updatedAt: new Date().toISOString(),
    updatedByUserId: data.updatedByUserId ?? tariff.updatedByUserId,
  };
  db.feeTariffs = db.feeTariffs.map((t) => (t.id === id ? updated : t));
  return updated;
};

export const deleteFeeTariff = (id: string): boolean => {
  const db = getDb();
  const index = db.feeTariffs.findIndex((t) => t.id === id);
  if (index === -1) return false;
  db.feeTariffs.splice(index, 1);
  return true;
};

// Fee Tariff Overrides
export const listFeeTariffOverrides = (filters?: {
  tariffId?: string | null;
  plotId?: string | null;
}) => {
  const db = getDb();
  let result = [...db.feeTariffOverrides];
  if (filters?.tariffId) {
    result = result.filter((o) => o.tariffId === filters.tariffId);
  }
  if (filters?.plotId) {
    result = result.filter((o) => o.plotId === filters.plotId);
  }
  return result;
};

export const findFeeTariffOverride = (tariffId: string, plotId: string): FeeTariffOverride | null => {
  const db = getDb();
  return db.feeTariffOverrides.find((o) => o.tariffId === tariffId && o.plotId === plotId) ?? null;
};

export const createFeeTariffOverride = (data: {
  tariffId: string;
  plotId: string;
  amount: number;
  comment?: string | null;
  createdByUserId?: string | null;
}): FeeTariffOverride => {
  const db = getDb();
  const existing = findFeeTariffOverride(data.tariffId, data.plotId);
  if (existing) {
    const patch: { amount: number; comment?: string | null; updatedByUserId?: string | null } = {
      amount: data.amount,
      updatedByUserId: data.createdByUserId ?? null,
    };
    if (data.comment !== undefined) patch.comment = data.comment;
    return updateFeeTariffOverride(existing.id, patch)!;
  }
  const now = new Date().toISOString();
  const override: FeeTariffOverride = {
    id: createId("ftoverride"),
    tariffId: data.tariffId,
    plotId: data.plotId,
    amount: data.amount,
    comment: data.comment ?? null,
    createdAt: now,
    updatedAt: now,
    createdByUserId: data.createdByUserId ?? null,
    updatedByUserId: null,
  };
  db.feeTariffOverrides.push(override);
  return override;
};

export const updateFeeTariffOverride = (
  id: string,
  data: {
    amount?: number;
    comment?: string | null;
    updatedByUserId?: string | null;
  }
): FeeTariffOverride | null => {
  const db = getDb();
  const override = db.feeTariffOverrides.find((o) => o.id === id);
  if (!override) return null;
  const updated: FeeTariffOverride = {
    ...override,
    ...data,
    updatedAt: new Date().toISOString(),
    updatedByUserId: data.updatedByUserId ?? override.updatedByUserId,
  };
  db.feeTariffOverrides = db.feeTariffOverrides.map((o) => (o.id === id ? updated : o));
  return updated;
};

export const deleteFeeTariffOverride = (id: string): boolean => {
  const db = getDb();
  const index = db.feeTariffOverrides.findIndex((o) => o.id === id);
  if (index === -1) return false;
  db.feeTariffOverrides.splice(index, 1);
  return true;
};

// Helper: Get effective tariff amount for a plot
export const getEffectiveTariffAmount = (
  tariffId: string,
  plotId: string,
  plotArea?: number | null
): number | null => {
  const db = getDb();
  const tariff = findFeeTariffById(tariffId);
  if (!tariff) return null;

  // Check for override first
  const override = findFeeTariffOverride(tariffId, plotId);
  if (override) {
    return override.amount;
  }

  // Calculate based on method
  if (tariff.method === "fixed") {
    return tariff.amount;
  } else if (tariff.method === "per_plot") {
    return tariff.amount;
  } else if (tariff.method === "per_sotka") {
    if (!plotArea) return null;
    return tariff.amount * plotArea;
  }

  return null;
};

// Payment Imports
export const listPaymentImports = (filters?: { status?: PaymentImport["status"] | null }) => {
  const db = getDb();
  let result = [...db.paymentImports];
  if (filters?.status) {
    result = result.filter((imp) => imp.status === filters.status);
  }
  return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const findPaymentImportById = (id: string): PaymentImport | null => {
  const db = getDb();
  return db.paymentImports.find((imp) => imp.id === id) ?? null;
};

export const createPaymentImport = (data: {
  fileName: string;
  totalRows: number;
  createdByUserId?: string | null;
}): PaymentImport => {
  const db = getDb();
  const now = new Date().toISOString();
  const import_: PaymentImport = {
    id: createId("pimport"),
    fileName: data.fileName,
    status: "draft",
    totalRows: data.totalRows,
    matchedRows: 0,
    unmatchedRows: 0,
    appliedRows: 0,
    createdAt: now,
    appliedAt: null,
    createdByUserId: data.createdByUserId ?? null,
    appliedByUserId: null,
  };
  db.paymentImports.push(import_);
  return import_;
};

export const updatePaymentImport = (
  id: string,
  data: {
    status?: PaymentImport["status"];
    matchedRows?: number;
    unmatchedRows?: number;
    errorRows?: number;
    appliedRows?: number;
    appliedAt?: string | null;
    appliedByUserId?: string | null;
  }
): PaymentImport | null => {
  const db = getDb();
  const import_ = db.paymentImports.find((imp) => imp.id === id);
  if (!import_) return null;
  const updated: PaymentImport = {
    ...import_,
    ...data,
    errorRows: data.errorRows !== undefined ? data.errorRows : import_.errorRows,
    appliedAt: data.appliedAt !== undefined ? data.appliedAt : import_.appliedAt,
    appliedByUserId: data.appliedByUserId !== undefined ? data.appliedByUserId : import_.appliedByUserId,
  };
  db.paymentImports = db.paymentImports.map((imp) => (imp.id === id ? updated : imp));
  return updated;
};

export const listPaymentImportRows = (importId: string) => {
  const db = getDb();
  return db.paymentImportRows
    .filter((row) => row.importId === importId)
    .sort((a, b) => a.rowIndex - b.rowIndex);
};

export const findPaymentImportRowById = (id: string): PaymentImportRow | null => {
  const db = getDb();
  return db.paymentImportRows.find((row) => row.id === id) ?? null;
};

export const createPaymentImportRow = (data: {
  importId: string;
  rowIndex: number;
  date: string;
  amount: number;
  purpose?: string | null;
  fullName?: string | null;
  phone?: string | null;
  plotNumber?: string | null;
  externalId?: string | null;
  matchedPlotId?: string | null;
  matchType?: "plot_number" | "phone" | "fullname" | "manual" | null;
  validationErrors?: string[] | null;
  rawData: Record<string, string | number | null>;
}): PaymentImportRow => {
  const db = getDb();
  const row: PaymentImportRow = {
    id: createId("pimportrow"),
    importId: data.importId,
    rowIndex: data.rowIndex,
    date: data.date,
    amount: data.amount,
    purpose: data.purpose ?? null,
    fullName: data.fullName ?? null,
    phone: data.phone ?? null,
    plotNumber: data.plotNumber ?? null,
    externalId: data.externalId ?? null,
    matchedPlotId: data.matchedPlotId ?? null,
    matchType: data.matchType ?? null,
    validationErrors: data.validationErrors ?? null,
    paymentId: null,
    rawData: data.rawData,
    createdAt: new Date().toISOString(),
  };
  db.paymentImportRows.push(row);
  return row;
};

export const updatePaymentImportRow = (
  id: string,
  data: {
    matchedPlotId?: string | null;
    matchType?: "plot_number" | "phone" | "fullname" | "manual" | null;
    paymentId?: string | null;
  }
): PaymentImportRow | null => {
  const db = getDb();
  const row = db.paymentImportRows.find((r) => r.id === id);
  if (!row) return null;
  const updated: PaymentImportRow = {
    ...row,
    ...data,
    matchedPlotId: data.matchedPlotId !== undefined ? data.matchedPlotId : row.matchedPlotId,
    matchType: data.matchType !== undefined ? data.matchType : row.matchType,
    paymentId: data.paymentId !== undefined ? data.paymentId : row.paymentId,
  };
  db.paymentImportRows = db.paymentImportRows.map((r) => (r.id === id ? updated : r));
  return updated;
};

// Debt Repayment Plans
export const listDebtRepaymentPlans = (filters?: {
  plotId?: string | null;
  periodId?: string | null;
}) => {
  const db = getDb();
  let result = [...db.debtRepaymentPlans];
  if (filters?.plotId) {
    result = result.filter((plan) => plan.plotId === filters.plotId);
  }
  if (filters?.periodId !== undefined) {
    if (filters.periodId === null) {
      result = result.filter((plan) => plan.periodId === null);
    } else {
      result = result.filter((plan) => plan.periodId === filters.periodId);
    }
  }
  return result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
};

export const findDebtRepaymentPlanById = (id: string): DebtRepaymentPlan | null => {
  const db = getDb();
  return db.debtRepaymentPlans.find((plan) => plan.id === id) ?? null;
};

export const findDebtRepaymentPlanByPlotPeriod = (
  plotId: string,
  periodId: string | null
): DebtRepaymentPlan | null => {
  const db = getDb();
  return (
    db.debtRepaymentPlans.find((plan) => plan.plotId === plotId && plan.periodId === periodId) ?? null
  );
};

export const createDebtRepaymentPlan = (data: {
  plotId: string;
  periodId?: string | null;
  status: DebtRepaymentPlan["status"];
  comment?: string | null;
  agreedAmount?: number | null;
  agreedDate?: string | null;
  createdByUserId?: string | null;
}): DebtRepaymentPlan => {
  const db = getDb();
  const now = new Date().toISOString();
  const plan: DebtRepaymentPlan = {
    id: createId("debtplan"),
    plotId: data.plotId,
    periodId: data.periodId ?? null,
    status: data.status,
    comment: data.comment ?? null,
    agreedAmount: data.agreedAmount ?? null,
    agreedDate: data.agreedDate ?? null,
    createdAt: now,
    updatedAt: now,
    createdByUserId: data.createdByUserId ?? null,
    updatedByUserId: null,
  };
  db.debtRepaymentPlans.push(plan);
  return plan;
};

export const updateDebtRepaymentPlan = (
  id: string,
  data: {
    status?: DebtRepaymentPlan["status"];
    comment?: string | null;
    agreedAmount?: number | null;
    agreedDate?: string | null;
    updatedByUserId?: string | null;
  }
): DebtRepaymentPlan | null => {
  const db = getDb();
  const plan = db.debtRepaymentPlans.find((p) => p.id === id);
  if (!plan) return null;
  const updated: DebtRepaymentPlan = {
    ...plan,
    ...data,
    comment: data.comment !== undefined ? data.comment : plan.comment,
    agreedAmount: data.agreedAmount !== undefined ? data.agreedAmount : plan.agreedAmount,
    agreedDate: data.agreedDate !== undefined ? data.agreedDate : plan.agreedDate,
    updatedAt: new Date().toISOString(),
    updatedByUserId: data.updatedByUserId !== undefined ? data.updatedByUserId : plan.updatedByUserId,
  };
  db.debtRepaymentPlans = db.debtRepaymentPlans.map((p) => (p.id === id ? updated : p));
  return updated;
};

// Debt Notification Templates
export const listDebtNotificationTemplates = () => {
  const db = getDb();
  return [...db.debtNotificationTemplates].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
};

export const findDebtNotificationTemplateById = (id: string): DebtNotificationTemplate | null => {
  const db = getDb();
  return db.debtNotificationTemplates.find((t) => t.id === id) ?? null;
};

export const createDebtNotificationTemplate = (data: {
  title: string;
  body: string;
  isDefault?: boolean;
  createdByUserId?: string | null;
}): DebtNotificationTemplate => {
  const db = getDb();
  const now = new Date().toISOString();
  
  // If this is default, unset other defaults
  if (data.isDefault) {
    db.debtNotificationTemplates.forEach((t) => {
      if (t.isDefault) {
        t.isDefault = false;
      }
    });
  }
  
  const template: DebtNotificationTemplate = {
    id: createId("debtnotif"),
    title: data.title,
    body: data.body,
    isDefault: data.isDefault ?? false,
    createdAt: now,
    updatedAt: now,
    createdByUserId: data.createdByUserId ?? null,
    updatedByUserId: null,
  };
  db.debtNotificationTemplates.push(template);
  return template;
};

export const updateDebtNotificationTemplate = (
  id: string,
  data: {
    title?: string;
    body?: string;
    isDefault?: boolean;
    updatedByUserId?: string | null;
  }
): DebtNotificationTemplate | null => {
  const db = getDb();
  const template = db.debtNotificationTemplates.find((t) => t.id === id);
  if (!template) return null;
  
  // If setting as default, unset other defaults
  if (data.isDefault === true) {
    db.debtNotificationTemplates.forEach((t) => {
      if (t.id !== id && t.isDefault) {
        t.isDefault = false;
      }
    });
  }
  
  const updated: DebtNotificationTemplate = {
    ...template,
    ...data,
    title: data.title !== undefined ? data.title : template.title,
    body: data.body !== undefined ? data.body : template.body,
    isDefault: data.isDefault !== undefined ? data.isDefault : template.isDefault,
    updatedAt: new Date().toISOString(),
    updatedByUserId: data.updatedByUserId !== undefined ? data.updatedByUserId : template.updatedByUserId,
  };
  db.debtNotificationTemplates = db.debtNotificationTemplates.map((t) => (t.id === id ? updated : t));
  return updated;
};

export const deleteDebtNotificationTemplate = (id: string): boolean => {
  const db = getDb();
  const index = db.debtNotificationTemplates.findIndex((t) => t.id === id);
  if (index === -1) return false;
  db.debtNotificationTemplates.splice(index, 1);
  return true;
};

// Debt Notification History
export const listDebtNotificationHistory = (filters?: {
  plotId?: string | null;
  periodId?: string | null;
  status?: DebtNotificationHistory["status"] | null;
}) => {
  const db = getDb();
  let result = [...db.debtNotificationHistory];
  if (filters?.plotId) {
    result = result.filter((h) => h.plotId === filters.plotId);
  }
  if (filters?.periodId !== undefined) {
    if (filters.periodId === null) {
      result = result.filter((h) => h.periodId === null);
    } else {
      result = result.filter((h) => h.periodId === filters.periodId);
    }
  }
  if (filters?.status) {
    result = result.filter((h) => h.status === filters.status);
  }
  return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const findDebtNotificationHistoryById = (id: string): DebtNotificationHistory | null => {
  const db = getDb();
  return db.debtNotificationHistory.find((h) => h.id === id) ?? null;
};

export const createDebtNotificationHistory = (data: {
  plotId: string;
  periodId?: string | null;
  templateId?: string | null;
  generatedText: string;
  status: DebtNotificationHistory["status"];
  createdByUserId?: string | null;
}): DebtNotificationHistory => {
  const db = getDb();
  const now = new Date().toISOString();
  const history: DebtNotificationHistory = {
    id: createId("debtnotifhist"),
    plotId: data.plotId,
    periodId: data.periodId ?? null,
    templateId: data.templateId ?? null,
    generatedText: data.generatedText,
    status: data.status,
    sentAt: null,
    createdAt: now,
    createdByUserId: data.createdByUserId ?? null,
    sentByUserId: null,
  };
  db.debtNotificationHistory.push(history);
  return history;
};

export const updateDebtNotificationHistory = (
  id: string,
  data: {
    status?: DebtNotificationHistory["status"];
    sentAt?: string | null;
    sentByUserId?: string | null;
  }
): DebtNotificationHistory | null => {
  const db = getDb();
  const history = db.debtNotificationHistory.find((h) => h.id === id);
  if (!history) return null;
  const updated: DebtNotificationHistory = {
    ...history,
    ...data,
    status: data.status !== undefined ? data.status : history.status,
    sentAt: data.sentAt !== undefined ? data.sentAt : history.sentAt,
    sentByUserId: data.sentByUserId !== undefined ? data.sentByUserId : history.sentByUserId,
  };
  db.debtNotificationHistory = db.debtNotificationHistory.map((h) => (h.id === id ? updated : h));
  return updated;
};
