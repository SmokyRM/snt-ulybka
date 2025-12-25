import { Plot } from "@/types/snt";
import { randomUUID } from "crypto";

const normalize = (value: string) => value.trim().toLowerCase();

const defaultPlots: Plot[] = [
  {
    id: "p1",
    plotId: "p1",
    street: "Центральная",
    number: "1",
    plotNumber: "1",
    plotCode: "A7K3D9Q2",
    cadastral: "50:00:000000:0001",
    ownerUserId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    membershipStatus: "UNKNOWN",
    isConfirmed: false,
    ownerFullName: null,
    phone: null,
    email: null,
    notes: null,
  },
  {
    id: "p2",
    plotId: "p2",
    street: "Центральная",
    number: "2",
    plotNumber: "2",
    plotCode: "B8L4E1W3",
    cadastral: "50:00:000000:0002",
    ownerUserId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    membershipStatus: "UNKNOWN",
    isConfirmed: false,
    ownerFullName: null,
    phone: null,
    email: null,
    notes: null,
  },
  {
    id: "p3",
    plotId: "p3",
    street: "Лесная",
    number: "3",
    plotNumber: "3",
    plotCode: "C9M5F2X4",
    cadastral: "50:00:000000:0003",
    ownerUserId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    membershipStatus: "UNKNOWN",
    isConfirmed: false,
    ownerFullName: null,
    phone: null,
    email: null,
    notes: null,
  },
  {
    id: "p4",
    plotId: "p4",
    street: "Лесная",
    number: "4",
    plotNumber: "4",
    plotCode: "D1N6G3Y5",
    cadastral: "50:00:000000:0004",
    ownerUserId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    membershipStatus: "UNKNOWN",
    isConfirmed: false,
    ownerFullName: null,
    phone: null,
    email: null,
    notes: null,
  },
];

type PlotCreateInput = {
  street: string;
  number: string;
  ownerFullName?: string | null;
  phone?: string | null;
  email?: string | null;
  membershipStatus?: Plot["membershipStatus"];
  isConfirmed?: boolean;
  notes?: string | null;
};

type PlotUpdateInput = Partial<PlotCreateInput>;

const getDb = () => {
  const g = globalThis as typeof globalThis & { __SNT_PLOTS__?: Plot[] };
  if (!g.__SNT_PLOTS__) {
    g.__SNT_PLOTS__ = [...defaultPlots];
  }
  return g.__SNT_PLOTS__;
};

const createId = () =>
  `plot-${typeof randomUUID === "function" ? randomUUID() : Math.random().toString(16).slice(2)}`;
const nowIso = () => new Date().toISOString();

export const findPlotByNumberStreet = (plotNumber: string, street: string) => {
  const plots = getDb();
  return plots.find(
    (plot) =>
      normalize(plot.plotNumber) === normalize(plotNumber) &&
      normalize(plot.street) === normalize(street)
  );
};

export const findPlotByCode = (plotCode: string) => {
  const plots = getDb();
  return plots.find((plot) => normalize(plot.plotCode ?? "") === normalize(plotCode));
};

export const claimPlot = (plotId: string, userId: string) => {
  const plots = getDb();
  const target = plots.find((plot) => plot.plotId === plotId || plot.id === plotId);
  if (!target) return null;
  if (target.ownerUserId) {
    return null;
  }
  target.ownerUserId = userId;
  return target;
};

export const isPlotTaken = (plotId: string) => {
  const plot = getDb().find((p) => p.plotId === plotId || p.id === plotId);
  return Boolean(plot?.ownerUserId);
};

export const getPlotForUser = (userId: string) => {
  return getDb().find((plot) => plot.ownerUserId === userId) || null;
};

type ListFilters = {
  confirmed?: boolean;
  membership?: Plot["membershipStatus"];
  missingContacts?: boolean;
  q?: string;
};

export const listPlots = (filters: ListFilters = {}) => {
  const { confirmed, membership, missingContacts, q } = filters;
  const search = q?.trim().toLowerCase();
  return getDb().filter((plot) => {
    if (typeof confirmed === "boolean" && plot.isConfirmed !== confirmed) return false;
    if (membership && plot.membershipStatus !== membership) return false;
    if (missingContacts && plot.phone) return false;
    if (missingContacts && plot.email) return false;
    if (search) {
      const haystack = `${plot.street} ${plot.plotNumber} ${plot.number} ${plot.ownerFullName ?? ""}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
};

export const findPlotById = (id: string) => {
  return getDb().find((plot) => plot.id === id || plot.plotId === id) || null;
};

const streetNumberExists = (street: string, number: string, excludeId?: string) => {
  const streetNorm = normalize(street);
  const numNorm = normalize(number);
  return getDb().some(
    (plot) =>
      (plot.id !== excludeId && plot.plotId !== excludeId) &&
      normalize(plot.street) === streetNorm &&
      normalize(plot.number) === numNorm
  );
};

export const addPlot = (input: PlotCreateInput): Plot => {
  const id = createId();
  const now = nowIso();
  const plot: Plot = {
    id,
    plotId: id,
    createdAt: now,
    updatedAt: now,
    street: input.street,
    number: input.number,
    plotNumber: input.number,
    ownerFullName: input.ownerFullName ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    membershipStatus: input.membershipStatus ?? "UNKNOWN",
    isConfirmed: input.isConfirmed ?? false,
    notes: input.notes ?? null,
    plotCode: "",
    ownerUserId: null,
  };
  const db = getDb();
  db.push(plot);
  return plot;
};

export const updatePlot = (id: string, input: PlotUpdateInput) => {
  const db = getDb();
  const existing = db.find((p) => p.id === id || p.plotId === id);
  if (!existing) return null;
  const updated: Plot = {
    ...existing,
    street: input.street ?? existing.street,
    number: input.number ?? existing.number,
    plotNumber: input.number ?? existing.plotNumber ?? existing.number,
    ownerFullName: input.ownerFullName ?? existing.ownerFullName ?? null,
    phone: input.phone ?? existing.phone ?? null,
    email: input.email ?? existing.email ?? null,
    membershipStatus: input.membershipStatus ?? existing.membershipStatus,
    isConfirmed: input.isConfirmed ?? existing.isConfirmed,
    notes: input.notes ?? existing.notes ?? null,
    updatedAt: nowIso(),
  };
  db.splice(db.indexOf(existing), 1, updated);
  return updated;
};

export const existsStreetNumber = (street: string, number: string, excludeId?: string) =>
  streetNumberExists(street, number, excludeId);
