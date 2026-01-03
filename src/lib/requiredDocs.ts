import fs from "fs/promises";
import path from "path";
import { isServerlessReadonlyFs, warnReadonlyFs } from "@/lib/fsGuard";

export type RequiredDoc = {
  id: string;
  title: string;
  url: string;
  publishedAt: string;
  requiredFor: "all" | "members" | "non-members";
};

export type DocAck = {
  userId: string;
  docId: string;
  ackAt: string;
};

const docsPath = path.join(process.cwd(), "data", "required-docs.json");
const ackPath = path.join(process.cwd(), "data", "doc-ack.json");

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(file, "utf-8");
    const parsed = JSON.parse(raw) as T;
    return parsed;
  } catch {
    if (isServerlessReadonlyFs()) {
      warnReadonlyFs("required-docs:read-fallback");
      return fallback;
    }
    const dir = path.dirname(file);
    await fs.mkdir(dir, { recursive: true });
    await writeJson(file, fallback);
    return fallback;
  }
}

async function writeJson<T>(file: string, data: T) {
  if (isServerlessReadonlyFs()) {
    warnReadonlyFs("required-docs:write");
    return;
  }
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tmp, file);
}

export async function getRequiredDocsForUser(input: {
  userId: string;
  membershipStatus: "member" | "non-member" | "unknown";
}) {
  const docs = await readJson<RequiredDoc[]>(docsPath, []);
  const acks = await readJson<DocAck[]>(ackPath, []);
  const filtered = docs.filter((d) => {
    if (d.requiredFor === "all") return true;
    if (d.requiredFor === "members" && input.membershipStatus === "member") return true;
    if (d.requiredFor === "non-members" && input.membershipStatus === "non-member") return true;
    return false;
  });
  return filtered.map((d) => {
    const ack = acks.find((a) => a.userId === input.userId && a.docId === d.id);
    return {
      ...d,
      acked: Boolean(ack),
      ackAt: ack?.ackAt ?? null,
    };
  });
}

export async function acknowledgeDoc(userId: string, docId: string): Promise<void> {
  if (!userId || !docId) return;
  const acks = await readJson<DocAck[]>(ackPath, []);
  const exists = acks.find((a) => a.userId === userId && a.docId === docId);
  if (exists) return;
  const now = new Date().toISOString();
  acks.push({ userId, docId, ackAt: now });
  await writeJson(ackPath, acks);
}

export async function addRequiredDoc(doc: Omit<RequiredDoc, "id" | "publishedAt"> & { publishedAt?: string }) {
  if (!doc.title || !doc.url || !doc.requiredFor) return;
  const docs = await readJson<RequiredDoc[]>(docsPath, []);
  const item: RequiredDoc = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    title: doc.title,
    url: doc.url,
    publishedAt: doc.publishedAt ?? new Date().toISOString(),
    requiredFor: doc.requiredFor,
  };
  docs.unshift(item);
  await writeJson(docsPath, docs);
}

export async function deleteRequiredDoc(docId: string) {
  if (!docId) return;
  const docs = await readJson<RequiredDoc[]>(docsPath, []);
  const updated = docs.filter((d) => d.id !== docId);
  await writeJson(docsPath, updated);
}
