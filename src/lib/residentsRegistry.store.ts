import "server-only";
import { randomUUID } from "crypto";
import { getByKey, getById } from "./plotsMaster.store";

export type Resident = { id: string; fio: string; phone?: string; address?: string };
export type OwnershipStatus = "pending" | "verified" | "rejected" | "conflict";
export type Ownership = {
  id: string;
  residentId: string;
  plotId: string;
  streetNo: number;
  plotLabel: string;
  status: OwnershipStatus;
  createdAt: string;
  verifiedAt?: string;
};

const residents: Resident[] = [
  { id: "user-resident-default", fio: "Анна Петрова", phone: "+7 999 111-22-33", address: "Берёзовая, 12" },
  { id: "user-r2", fio: "Сергей Кузнецов", phone: "+7 999 222-33-44", address: "Луговая, 7" },
];

const ownerships: Ownership[] = [
  {
    id: "own-1",
    residentId: "user-resident-default",
    plotId: "s1-1",
    streetNo: 1,
    plotLabel: "1",
    status: "verified",
    createdAt: "2024-03-01T10:00:00Z",
    verifiedAt: "2024-03-05T10:00:00Z",
  },
  {
    id: "own-2",
    residentId: "user-r2",
    plotId: "s2-2",
    streetNo: 2,
    plotLabel: "2",
    status: "pending",
    createdAt: "2024-03-02T10:00:00Z",
  },
];

const findResidentById = (id: string) => residents.find((r) => r.id === id) ?? null;

const ensureResident = (data: { residentId?: string; fio: string; phone?: string; address?: string }): Resident => {
  if (data.residentId) {
    const existing = findResidentById(data.residentId);
    if (existing) return existing;
  }
  const newResident: Resident = {
    id: data.residentId ?? randomUUID(),
    fio: data.fio,
    phone: data.phone,
    address: data.address,
  };
  residents.push(newResident);
  return newResident;
};

export const createResidentAndRequestOwnership = (input: {
  residentId?: string;
  fio: string;
  phone?: string;
  address?: string;
  streetNo: number;
  plotLabel: string;
}) => {
  const plot = getByKey(input.streetNo, input.plotLabel);
  if (!plot) return { ok: false as const, error: "Участок не найден в реестре" };
  const resident = ensureResident(input);
  const hasVerifiedOther = ownerships.some(
    (o) => o.plotId === plot.id && o.status === "verified" && o.residentId !== resident.id,
  );
  const ownership: Ownership = {
    id: randomUUID(),
    residentId: resident.id,
    plotId: plot.id,
    streetNo: plot.streetNo,
    plotLabel: plot.plotLabel,
    status: hasVerifiedOther ? "conflict" : "pending",
    createdAt: new Date().toISOString(),
  };
  ownerships.push(ownership);
  return { ok: true as const, ownership };
};

export const listRegistry = (params: { street?: number; status?: OwnershipStatus | "all"; q?: string } = {}) => {
  const streetNo = params.street;
  const status = params.status && params.status !== "all" ? params.status : undefined;
  const q = params.q?.trim().toLowerCase();
  return ownerships
    .filter((o) => (streetNo ? o.streetNo === streetNo : true))
    .filter((o) => (status ? o.status === status : true))
    .filter((o) => {
      if (!q) return true;
      const resident = findResidentById(o.residentId);
      const haystack = `${o.plotLabel} ${o.streetNo} ${resident?.fio ?? ""} ${resident?.phone ?? ""}`.toLowerCase();
      return haystack.includes(q);
    })
    .map((o) => {
      const resident = findResidentById(o.residentId);
      return {
        id: o.id,
        streetNo: o.streetNo,
        plotLabel: o.plotLabel,
        fio: resident?.fio ?? "—",
        phone: resident?.phone ?? "—",
        address: resident?.address ?? "—",
        status: o.status,
      };
    });
};

export const listMyOwnerships = (residentId: string) => {
  return ownerships
    .filter((o) => o.residentId === residentId)
    .map((o) => {
      const plot = getById(o.plotId);
      if (!plot) return null;
      return { ownership: o, plot };
    })
    .filter(Boolean) as Array<{ ownership: Ownership; plot: ReturnType<typeof getById> extends infer P ? NonNullable<P> : never }>;
};

export const verifyOwnership = (ownershipId: string) => {
  const item = ownerships.find((o) => o.id === ownershipId);
  if (!item) return null;
  item.status = "verified";
  item.verifiedAt = new Date().toISOString();
  return item;
};

export const rejectOwnership = (ownershipId: string) => {
  const item = ownerships.find((o) => o.id === ownershipId);
  if (!item) return null;
  item.status = "rejected";
  item.verifiedAt = undefined;
  return item;
};

export const findOwnershipById = (id: string): Ownership | null => ownerships.find((o) => o.id === id) ?? null;
