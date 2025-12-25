"use client";

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
};
  }
  return g.__SNT_DB__;
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

export const createAccrualPeriod = (payload: { year: number; month: number; type: string }) => {
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

export const listPayments = (filters?: { periodId?: string; plotId?: string; includeVoided?: boolean }) => {
  const db = getDb();
  return db.payments.filter((p) => {
    if (!filters?.includeVoided && p.isVoided) return false;
    if (filters?.periodId && p.periodId !== filters.periodId) return false;
    if (filters?.plotId && p.plotId !== filters.plotId) return false;
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
    createdByUserId: data.createdByUserId,
    createdAt: now,
    isVoided: false,
    voidReason: null,
    voidedAt: null,
    voidedByUserId: null,
    importBatchId: data.importBatchId ?? null,
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
