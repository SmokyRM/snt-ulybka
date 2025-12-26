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
  ElectricityMeter,
  MeterReading,
  ElectricityTariff,
  DebtNotification,
  Expense,
  TargetFund,
} from "@/types/snt";

interface MockDb {
  users: User[];
  plots: Plot[];
  ownershipRequests: OwnershipRequest[];
  plotOwners: PlotOwner[];
  auditLogs: AuditLog[];
  settings: SettingEntry[];
  entityVersions: EntityVersion[];
  persons: Person[];
  accrualPeriods: AccrualPeriod[];
  accrualItems: AccrualItem[];
  payments: Payment[];
  importBatches: ImportBatch[];
  electricityMeters: ElectricityMeter[];
  meterReadings: MeterReading[];
  electricityTariffs: ElectricityTariff[];
  debtNotifications: DebtNotification[];
  expenses: Expense[];
  targetFunds: TargetFund[];
}

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
    id: "user-board",
    email: "board@snt.ru",
    fullName: "Правление СНТ",
    role: "board",
    status: "verified",
  },
];

const getDb = (): MockDb => {
  const g = globalThis as typeof globalThis & { __SNT_DB__?: MockDb };
  if (!g.__SNT_DB__) {
    const now = new Date().toISOString();
    g.__SNT_DB__ = {
      users: [...defaultUsers],
      plots: [...defaultPlots],
      ownershipRequests: [],
      plotOwners: [],
      auditLogs: [],
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
      ],
      entityVersions: [],
      persons: [],
      accrualPeriods: [],
      accrualItems: [],
      payments: [],
      importBatches: [],
      electricityMeters: [],
      meterReadings: [],
      electricityTariffs: [],
      debtNotifications: [],
      expenses: [],
      targetFunds: [],
    };
  }
  return g.__SNT_DB__ as MockDb;
};

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

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
    ],
    entityVersions: [],
    persons: [],
    accrualPeriods: [],
    accrualItems: [],
    payments: [],
    importBatches: [],
    electricityMeters: [],
    meterReadings: [],
    electricityTariffs: [],
    debtNotifications: [],
    expenses: [],
    targetFunds: [],
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

export const findPlotById = (id: string) => getDb().plots.find((p) => p.id === id) ?? null;

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

export const listPlotsWithFilters = (filters?: {
  query?: string | null;
  street?: string | null;
  membershipStatus?: Plot["membershipStatus"] | null;
  archived?: boolean | null;
  page?: number;
  pageSize?: number;
}) => {
  const {
    query,
    street,
    membershipStatus,
    archived = null,
    page = 1,
    pageSize = 50,
  } = filters ?? {};
  const db = getDb();
  const q = query?.trim().toLowerCase() ?? "";
  const filtered = db.plots.filter((plot) => {
    if (street && plot.street !== street) return false;
    if (membershipStatus && plot.membershipStatus !== membershipStatus) return false;
    if (archived !== null && (plot.status === "archived") !== archived) return false;
    if (!q) return true;
    const ownerLink = db.plotOwners.find((po) => po.plotNumber === plot.plotNumber);
    const owner =
      ownerLink && ownerLink.userIdentifier
        ? db.persons.find((p) => p.id === ownerLink.userIdentifier)
        : null;
    const haystack = [
      plot.street,
      plot.plotNumber,
      plot.ownerFullName ?? "",
      plot.phone ?? "",
      plot.email ?? "",
      owner?.fullName ?? "",
      owner?.phone ?? "",
      owner?.email ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
  const sorted = filtered.sort((a, b) => {
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
  periodId: string;
  plotId: string;
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
    periodId: data.periodId,
    plotId: data.plotId,
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
export const addExpense = (data: {
  date: string;
  amount: number;
  category: Expense["category"];
  description: string;
  vendor?: string | null;
  targetFundId?: string | null;
  createdByUserId: string | null;
}) => {
  const now = new Date().toISOString();
  const expense: Expense = {
    id: createId("exp"),
    date: data.date,
    amount: data.amount,
    category: data.category,
    description: data.description,
    vendor: data.vendor ?? null,
    targetFundId: data.targetFundId ?? null,
    createdAt: now,
    createdByUserId: data.createdByUserId,
  };
  const db = getDb();
  db.expenses.unshift(expense);
  return expense;
};

export const listExpenses = (filters?: { from?: string | null; to?: string | null; category?: Expense["category"] | null }) => {
  const db = getDb();
  const fromTs = filters?.from ? new Date(filters.from).getTime() : null;
  const toTs = filters?.to ? new Date(filters.to).getTime() : null;
  return db.expenses.filter((e) => {
    const ts = new Date(e.date).getTime();
    if (fromTs && ts < fromTs) return false;
    if (toTs && ts > toTs) return false;
    if (filters?.category && e.category !== filters.category) return false;
    return true;
  });
};

// Target funds
export const addTargetFund = (data: {
  title: string;
  description: string;
  targetAmount: number;
  status?: TargetFund["status"];
  aliases?: string[] | null;
}) => {
  const fund: TargetFund = {
    id: createId("fund"),
    title: data.title,
    description: data.description,
    targetAmount: data.targetAmount,
    status: data.status ?? "active",
    createdAt: new Date().toISOString(),
    aliases: data.aliases ?? [],
  };
  const db = getDb();
  db.targetFunds.unshift(fund);
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
