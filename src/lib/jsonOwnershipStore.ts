import fs from "fs/promises";
import path from "path";
import type { OwnershipVerification } from "@/lib/plots";
import type { OwnershipVerificationStore } from "@/lib/ownershipStore";
import { normalizeOwnershipVerification } from "@/lib/normalizeOwnershipVerification";
import { isServerlessReadonlyFs, warnReadonlyFs } from "@/lib/fsGuard";

const ownershipVerificationsPath = path.join(process.cwd(), "data", "ownership-verifications.json");
const isProd = process.env.NODE_ENV === "production";
const isReadonlyFs = isProd || isServerlessReadonlyFs();

const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

async function writeJson<T>(file: string, data: T) {
  if (isReadonlyFs) {
    warnReadonlyFs("ownership-store:write");
    return;
  }
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tmp, file);
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    if (isReadonlyFs) {
      warnReadonlyFs("ownership-store:read-fallback");
      return fallback;
    }
    const dir = path.dirname(file);
    await fs.mkdir(dir, { recursive: true });
    await writeJson(file, fallback);
    return fallback;
  }
}

async function getAll(): Promise<OwnershipVerification[]> {
  const items = await readJson<OwnershipVerification[]>(ownershipVerificationsPath, []);
  return items.map(normalizeOwnershipVerification);
}

export function createJsonOwnershipStore(): OwnershipVerificationStore {
  return {
    async listAll() {
      return getAll();
    },
    async listByUser(userId: string) {
      if (!userId) return [];
      const items = await getAll();
      return items.filter((item) => item.userId === userId);
    },
    async getByUserAndCadastral(userId: string, cadastralNumber: string) {
      if (!userId || !cadastralNumber) return null;
      const items = await getAll();
      return (
        items.find(
          (item) =>
            item.userId === userId &&
            item.cadastralNumber.toLowerCase() === cadastralNumber.toLowerCase(),
        ) ?? null
      );
    },
    async create(input) {
      if (isReadonlyFs) {
        warnReadonlyFs("ownership-store:create");
        throw new Error("READONLY_FS");
      }
      const items = await getAll();
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
      await writeJson(ownershipVerificationsPath, items);
      return record;
    },
    async update(id, patch) {
      if (isReadonlyFs) {
        warnReadonlyFs("ownership-store:update");
        throw new Error("READONLY_FS");
      }
      const items = await getAll();
      const idx = items.findIndex((item) => item.id === id);
      if (idx === -1) {
        throw new Error("OWNERSHIP_VERIFICATION_NOT_FOUND");
      }
      const next = normalizeOwnershipVerification({ ...items[idx], ...patch });
      items[idx] = next;
      await writeJson(ownershipVerificationsPath, items);
      return next;
    },
  };
}
