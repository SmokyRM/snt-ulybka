import type { OwnershipVerification } from "@/lib/plots";
import type { OwnershipVerificationStore } from "@/lib/ownershipStore";

const KV_URL = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
const KV_KEY = "ownership_verifications";

const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

async function kvFetch(path: string, init?: RequestInit) {
  if (!KV_URL || !KV_TOKEN) {
    throw new Error("OWNERSHIP_STORE_UNCONFIGURED");
  }
  const res = await fetch(`${KV_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OWNERSHIP_STORE_KV_ERROR:${res.status}:${text}`);
  }
  return res.json() as Promise<{ result?: unknown }>;
}

async function readAll(): Promise<OwnershipVerification[]> {
  const data = await kvFetch(`/get/${KV_KEY}`);
  const raw = data?.result;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as OwnershipVerification[];
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as OwnershipVerification[];
    } catch {
      return [];
    }
  }
  return [];
}

async function writeAll(items: OwnershipVerification[]) {
  await kvFetch(`/set/${KV_KEY}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(items),
  });
}

export function createKvOwnershipStore(): OwnershipVerificationStore {
  return {
    async listAll() {
      return readAll();
    },
    async listByUser(userId: string) {
      if (!userId) return [];
      const items = await readAll();
      return items.filter((item) => item.userId === userId);
    },
    async getByUserAndCadastral(userId: string, cadastralNumber: string) {
      if (!userId || !cadastralNumber) return null;
      const items = await readAll();
      return (
        items.find(
          (item) =>
            item.userId === userId &&
            item.cadastralNumber.toLowerCase() === cadastralNumber.toLowerCase(),
        ) ?? null
      );
    },
    async create(input) {
      const items = await readAll();
      const now = new Date().toISOString();
      const record: OwnershipVerification = {
        id: makeId(),
        userId: input.userId,
        cadastralNumber: input.cadastralNumber,
        documentMeta: input.documentMeta,
        status: input.status ?? "sent",
        createdAt: now,
        reviewedAt: null,
        reviewNote: null,
      };
      items.push(record);
      await writeAll(items);
      return record;
    },
    async update(input) {
      const items = await readAll();
      const idx = items.findIndex((item) => item.id === input.id);
      if (idx === -1) return null;
      const now = new Date().toISOString();
      items[idx] = {
        ...items[idx],
        status: input.status,
        reviewedAt: now,
        reviewNote: input.reviewNote ?? items[idx].reviewNote ?? null,
      };
      await writeAll(items);
      return items[idx];
    },
  };
}
