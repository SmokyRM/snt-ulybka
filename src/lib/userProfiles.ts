import fs from "fs/promises";
import path from "path";
import { isServerlessReadonlyFs, warnReadonlyFs } from "@/lib/fsGuard";

export type UserProfile = {
  userId: string;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  cadastralNumbers?: string[];
  updatedAt: string;
  updatedBy: "user" | "admin" | "system";
};

const profilesPath = path.join(process.cwd(), "data", "user-profiles.json");

async function writeJson<T>(file: string, data: T) {
  if (isServerlessReadonlyFs()) {
    warnReadonlyFs("user-profiles:write");
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
      warnReadonlyFs("user-profiles:read-fallback");
      return fallback;
    }
    const dir = path.dirname(file);
    await fs.mkdir(dir, { recursive: true });
    await writeJson(file, fallback);
    return fallback;
  }
}

function ensureProfileShape(userId: string, profile?: Partial<UserProfile>): UserProfile {
  const now = new Date().toISOString();
  return {
    userId,
    fullName: profile?.fullName ?? null,
    phone: profile?.phone ?? null,
    email: profile?.email ?? null,
    cadastralNumbers: Array.isArray(profile?.cadastralNumbers) ? profile?.cadastralNumbers : [],
    updatedAt: profile?.updatedAt ?? now,
    updatedBy: profile?.updatedBy ?? "system",
  };
}

export async function getUserProfile(userId: string): Promise<UserProfile> {
  if (!userId) {
    return ensureProfileShape("", { updatedBy: "system" });
  }
  const profiles = await readJson<UserProfile[]>(profilesPath, []);
  const found = profiles.find((p) => p.userId === userId);
  if (found) return ensureProfileShape(userId, found);
  return ensureProfileShape(userId, { updatedBy: "system" });
}

export async function upsertUserProfileByUser(userId: string, input: { fullName?: string; phone?: string; cadastralNumbers?: string[] }) {
  if (!userId) return;
  const profiles = await readJson<UserProfile[]>(profilesPath, []);
  const now = new Date().toISOString();
  const idx = profiles.findIndex((p) => p.userId === userId);
  const base = idx === -1 ? ensureProfileShape(userId, { updatedAt: now, updatedBy: "user" }) : profiles[idx];
  const updated: UserProfile = {
    ...base,
    fullName: input.fullName ?? base.fullName,
    phone: input.phone ?? base.phone,
    cadastralNumbers: Array.isArray(base.cadastralNumbers) ? base.cadastralNumbers : [],
    updatedAt: now,
    updatedBy: "user",
  };
  if (idx === -1) {
    profiles.push(updated);
  } else {
    profiles[idx] = updated;
  }
  await writeJson(profilesPath, profiles);
}

export async function upsertUserProfileByAdmin(
  userId: string,
  input: { fullName?: string; phone?: string; email?: string; cadastralNumbers?: string[] },
) {
  if (!userId) return;
  const profiles = await readJson<UserProfile[]>(profilesPath, []);
  const now = new Date().toISOString();
  const idx = profiles.findIndex((p) => p.userId === userId);
  const base = idx === -1 ? ensureProfileShape(userId, { updatedAt: now, updatedBy: "admin" }) : profiles[idx];
  const updated: UserProfile = {
    ...base,
    fullName: input.fullName ?? base.fullName,
    phone: input.phone ?? base.phone,
    email: input.email ?? base.email,
    cadastralNumbers: input.cadastralNumbers ?? base.cadastralNumbers ?? [],
    updatedAt: now,
    updatedBy: "admin",
  };
  if (idx === -1) {
    profiles.push(updated);
  } else {
    profiles[idx] = updated;
  }
  await writeJson(profilesPath, profiles);
}
