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
} from "@/types/snt";

interface MockDb {
  users: User[];
  plots: Plot[];
  ownershipRequests: OwnershipRequest[];
  plotOwners: PlotOwner[];
  auditLogs: AuditLog[];
  settings: SettingEntry[];
  entityVersions: EntityVersion[];
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
      ],
      entityVersions: [],
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
    ],
    entityVersions: [],
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
}) => {
  const db = getDb();
  const { action, from, to, limit = 50 } = filters ?? {};
  const fromDate = from ? new Date(from).getTime() : null;
  const toDate = to ? new Date(to).getTime() : null;
  return db.auditLogs
    .filter((log) => {
      if (action && log.action !== action) return false;
      const ts = new Date(log.createdAt).getTime();
      if (fromDate && ts < fromDate) return false;
      if (toDate && ts > toDate) return false;
      return true;
    })
    .slice(0, limit);
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
