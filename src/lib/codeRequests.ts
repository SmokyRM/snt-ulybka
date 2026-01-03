import fs from "fs/promises";
import path from "path";
import { isServerlessReadonlyFs, warnReadonlyFs } from "@/lib/fsGuard";

export type CodeRequestStatus = "NEW" | "RESOLVED";

export type CodeRequest = {
  id: string;
  userId: string;
  plotDisplay: string;
  cadastralNumber?: string | null;
  comment?: string | null;
  status: CodeRequestStatus;
  adminComment?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  plotId?: string | null;
};

const filePath = path.join(process.cwd(), "data", "code-requests.json");

async function writeJson<T>(file: string, data: T) {
  if (isServerlessReadonlyFs()) {
    warnReadonlyFs("code-requests:write");
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
    if (isServerlessReadonlyFs()) {
      warnReadonlyFs("code-requests:read-fallback");
      return fallback;
    }
    const dir = path.dirname(file);
    await fs.mkdir(dir, { recursive: true });
    await writeJson(file, fallback);
    return fallback;
  }
}

const makeId = (prefix?: string) => {
  const base = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return prefix ? `${prefix}-${base}` : base;
};

export async function createCodeRequest(params: { userId: string; plotDisplay: string; cadastralNumber?: string | null; comment?: string | null }) {
  if (!params.userId || !params.plotDisplay.trim()) return null;
  const items = await readJson<CodeRequest[]>(filePath, []);
  const now = new Date().toISOString();
  const req: CodeRequest = {
    id: makeId("code"),
    userId: params.userId,
    plotDisplay: params.plotDisplay.trim(),
    cadastralNumber: params.cadastralNumber?.trim() || null,
    comment: params.comment?.trim() || null,
    status: "NEW",
    createdAt: now,
    adminComment: null,
    resolvedBy: null,
    resolvedAt: null,
    plotId: null,
  };
  items.push(req);
  await writeJson(filePath, items);
  return req;
}

export async function listCodeRequests() {
  return readJson<CodeRequest[]>(filePath, []);
}

export async function resolveCodeRequest(input: {
  id: string;
  adminComment?: string | null;
  plotId?: string | null;
  actorUserId?: string | null;
}) {
  if (!input.id) return;
  const items = await readJson<CodeRequest[]>(filePath, []);
  const idx = items.findIndex((r) => r.id === input.id);
  if (idx === -1) return;
  items[idx] = {
    ...items[idx],
    status: "RESOLVED",
    adminComment: input.adminComment?.trim() || null,
    resolvedBy: input.actorUserId ? `admin:${input.actorUserId}` : null,
    resolvedAt: new Date().toISOString(),
    plotId: input.plotId ?? items[idx].plotId ?? null,
  };
  await writeJson(filePath, items);
  return items[idx];
}
