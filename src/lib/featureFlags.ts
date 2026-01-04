import fs from "fs/promises";
import path from "path";
import { isServerlessReadonlyFs, warnReadonlyFs } from "@/lib/fsGuard";

export type FeatureFlagKey =
  | "newPublicHome"
  | "debtsV2"
  | "cabinetMvp"
  | "forceNewHome"
  | "ai_assistant_enabled";
export type FeatureFlags = Record<FeatureFlagKey, boolean>;

const defaultFlags: FeatureFlags = {
  newPublicHome: false,
  debtsV2: false,
  cabinetMvp: false,
  forceNewHome: false,
  ai_assistant_enabled: false,
};

const flagsPath = path.join(process.cwd(), "data", "feature-flags.json");
const KV_URL = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
const KV_KEY = "feature_flags";

const isKvConfigured = () => Boolean(KV_URL && KV_TOKEN);

async function kvFetch(path: string, init?: RequestInit) {
  if (!KV_URL || !KV_TOKEN) {
    throw new Error("FEATURE_FLAGS_KV_UNCONFIGURED");
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
    throw new Error(`FEATURE_FLAGS_KV_ERROR:${res.status}:${text}`);
  }
  return res.json() as Promise<{ result?: unknown }>;
}

async function readFlagsFromKv(): Promise<FeatureFlags | null> {
  if (!isKvConfigured()) return null;
  try {
    const data = await kvFetch(`/get/${KV_KEY}`);
    const raw = data?.result;
    if (!raw) return null;
    if (typeof raw === "string") {
      return JSON.parse(raw) as FeatureFlags;
    }
    return raw as FeatureFlags;
  } catch {
    return null;
  }
}

async function writeFlagsToKv(flags: FeatureFlags) {
  await kvFetch(`/set/${KV_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(flags),
  });
}

async function ensureFile(): Promise<FeatureFlags> {
  try {
    const raw = await fs.readFile(flagsPath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<FeatureFlags>;
    return { ...defaultFlags, ...parsed };
  } catch {
    if (isServerlessReadonlyFs()) {
      warnReadonlyFs("feature-flags:read-fallback");
      return defaultFlags;
    }
    const dir = path.dirname(flagsPath);
    await fs.mkdir(dir, { recursive: true });
    await writeFlags(defaultFlags);
    return defaultFlags;
  }
}

async function writeFlags(flags: FeatureFlags) {
  if (isServerlessReadonlyFs()) {
    warnReadonlyFs("feature-flags:write");
    return;
  }
  const tmpPath = `${flagsPath}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(flags, null, 2), "utf-8");
  await fs.rename(tmpPath, flagsPath);
}

export async function getFeatureFlags(): Promise<FeatureFlags> {
  if (isKvConfigured()) {
    const kvFlags = await readFlagsFromKv();
    if (kvFlags) {
      return { ...defaultFlags, ...kvFlags };
    }
    try {
      await writeFlagsToKv(defaultFlags);
    } catch {
      // ignore KV write errors
    }
    return defaultFlags;
  }
  return ensureFile();
}

export async function setFeatureFlag(key: FeatureFlagKey, value: boolean): Promise<FeatureFlags> {
  if (isKvConfigured()) {
    const current = await getFeatureFlags();
    const updated: FeatureFlags = { ...current, [key]: value };
    await writeFlagsToKv(updated);
    return updated;
  }
  const current = await ensureFile();
  const updated: FeatureFlags = { ...current, [key]: value };
  await writeFlags(updated);
  return updated;
}

export function isFeatureEnabled(flags: FeatureFlags, key: FeatureFlagKey): boolean {
  return Boolean(flags[key]);
}

export const isFeatureFlagsWritable = (): boolean => isKvConfigured();
