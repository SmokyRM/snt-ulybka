import fs from "fs/promises";
import path from "path";

export type MembershipStatus = "member" | "non-member" | "pending" | "unknown";
export type MembershipRecord = {
  userId: string;
  status: MembershipStatus;
  updatedAt: string;
  updatedBy: "system" | "admin";
  notes: string | null;
};

export type MembershipRequestStatus = "new" | "approved" | "rejected";
export type MembershipRequest = {
  id: string;
  userId: string;
  createdAt: string;
  fullName: string;
  phone: string;
  plotNumber: string;
  street: string | null;
  comment: string | null;
  status: MembershipRequestStatus;
  reviewedAt: string | null;
};

const membershipPath = path.join(process.cwd(), "data", "membership.json");
const requestsPath = path.join(process.cwd(), "data", "membership-requests.json");

const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

async function writeJson<T>(file: string, data: T) {
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tmp, file);
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    const dir = path.dirname(file);
    await fs.mkdir(dir, { recursive: true });
    await writeJson(file, fallback);
    return fallback;
  }
}

export async function getMembershipStatus(userId: string): Promise<MembershipRecord> {
  if (!userId) {
    return { userId: "", status: "unknown", updatedAt: new Date().toISOString(), updatedBy: "system", notes: null };
  }
  const items = await readJson<MembershipRecord[]>(membershipPath, []);
  const found = items.find((m) => m.userId === userId);
  if (found) return found;
  return { userId, status: "unknown", updatedAt: new Date().toISOString(), updatedBy: "system", notes: null };
}

export async function submitMembershipRequest(input: {
  userId: string;
  fullName: string;
  phone: string;
  plotNumber: string;
  street?: string | null;
  comment?: string | null;
}) {
  if (!input.userId || !input.fullName || !input.phone || !input.plotNumber) return;
  const requests = await readJson<MembershipRequest[]>(requestsPath, []);
  const existing = requests.find((r) => r.userId === input.userId && r.status === "new");
  const now = new Date().toISOString();
  if (existing) {
    existing.fullName = input.fullName;
    existing.phone = input.phone;
    existing.plotNumber = input.plotNumber;
    existing.street = input.street ?? null;
    existing.comment = input.comment ?? null;
    existing.createdAt = now;
    await writeJson(requestsPath, requests);
    return existing;
  }
  const item: MembershipRequest = {
    id: makeId(),
    userId: input.userId,
    createdAt: now,
    fullName: input.fullName,
    phone: input.phone,
    plotNumber: input.plotNumber,
    street: input.street ?? null,
    comment: input.comment ?? null,
    status: "new",
    reviewedAt: null,
  };
  requests.unshift(item);
  await writeJson(requestsPath, requests);
  return item;
}

export async function getMembershipRequests(): Promise<MembershipRequest[]> {
  return readJson<MembershipRequest[]>(requestsPath, []);
}

export async function approveMembershipRequest(id: string) {
  if (!id) return;
  const requests = await readJson<MembershipRequest[]>(requestsPath, []);
  const idx = requests.findIndex((r) => r.id === id);
  if (idx === -1) return;
  const now = new Date().toISOString();
  requests[idx] = { ...requests[idx], status: "approved", reviewedAt: now };
  await writeJson(requestsPath, requests);

  const memberships = await readJson<MembershipRecord[]>(membershipPath, []);
  const mIdx = memberships.findIndex((m) => m.userId === requests[idx].userId);
  const record: MembershipRecord = {
    userId: requests[idx].userId,
    status: "member",
    updatedAt: now,
    updatedBy: "admin",
    notes: null,
  };
  if (mIdx === -1) {
    memberships.push(record);
  } else {
    memberships[mIdx] = record;
  }
  await writeJson(membershipPath, memberships);
}

export async function rejectMembershipRequest(id: string) {
  if (!id) return;
  const requests = await readJson<MembershipRequest[]>(requestsPath, []);
  const idx = requests.findIndex((r) => r.id === id);
  if (idx === -1) return;
  const now = new Date().toISOString();
  requests[idx] = { ...requests[idx], status: "rejected", reviewedAt: now };
  await writeJson(requestsPath, requests);

  const memberships = await readJson<MembershipRecord[]>(membershipPath, []);
  const mIdx = memberships.findIndex((m) => m.userId === requests[idx].userId);
  const record: MembershipRecord = {
    userId: requests[idx].userId,
    status: "non-member",
    updatedAt: now,
    updatedBy: "admin",
    notes: null,
  };
  if (mIdx === -1) {
    memberships.push(record);
  } else {
    memberships[mIdx] = record;
  }
  await writeJson(membershipPath, memberships);
}
