"use client";

import {
  OwnershipRequest,
  Plot,
  PlotOwner,
  RequestStatus,
  User,
  UserStatus,
} from "@/types/snt";

interface MockDb {
  users: User[];
  plots: Plot[];
  ownershipRequests: OwnershipRequest[];
  plotOwners: PlotOwner[];
}

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const normalizePhone = (value: string) => value.replace(/\D/g, "");
const normalizeIdentifier = (value: string) =>
  value.includes("@") ? normalizeEmail(value) : normalizePhone(value);

const defaultPlots: Plot[] = Array.from({ length: 20 }, (_, idx) => {
  const num = (idx + 1).toString();
  return {
    plotId: `plot-${num}`,
    plotNumber: num,
    street: idx < 10 ? "Центральная" : "Лесная",
    plotCode: `CODE${num.padStart(2, "0")}`,
    ownerUserId: null,
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
    g.__SNT_DB__ = {
      users: [...defaultUsers],
      plots: [...defaultPlots],
      ownershipRequests: [],
      plotOwners: [],
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
  g.__SNT_DB__ = {
    users: [...defaultUsers],
    plots: [...defaultPlots],
    ownershipRequests: [],
    plotOwners: [],
  };
};
