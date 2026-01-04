import fs from "fs/promises";
import path from "path";
import { isServerlessReadonlyFs, warnReadonlyFs } from "@/lib/fsGuard";

export type AiSettings = {
  strictMode: boolean;
  verbosity: "short" | "normal";
  citations: boolean;
  temperature: "low" | "medium";
  ai_answer_style: "short" | "normal" | "detailed";
  ai_tone: "official" | "simple";
  ai_show_sources: boolean;
};

export const DEFAULT_AI_SETTINGS: AiSettings = {
  strictMode: true,
  verbosity: "normal",
  citations: true,
  temperature: "low",
  ai_answer_style: "normal",
  ai_tone: "official",
  ai_show_sources: true,
};

const settingsPath = path.join(process.cwd(), "data", "ai-settings.json");
const KV_URL = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
const KV_KEY = "ai_settings";

const isKvConfigured = () => Boolean(KV_URL && KV_TOKEN);

async function kvFetch(pathname: string, init?: RequestInit) {
  if (!KV_URL || !KV_TOKEN) {
    throw new Error("AI_SETTINGS_KV_UNCONFIGURED");
  }
  const res = await fetch(`${KV_URL}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI_SETTINGS_KV_ERROR:${res.status}:${text}`);
  }
  return res.json() as Promise<{ result?: unknown }>;
}

async function readSettingsFromKv(): Promise<AiSettings | null> {
  if (!isKvConfigured()) return null;
  try {
    const data = await kvFetch(`/get/${KV_KEY}`);
    const raw = data?.result;
    if (!raw) return null;
    if (typeof raw === "string") {
      return JSON.parse(raw) as AiSettings;
    }
    return raw as AiSettings;
  } catch {
    return null;
  }
}

async function writeSettingsToKv(settings: AiSettings) {
  await kvFetch(`/set/${KV_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
}

async function ensureFile(): Promise<AiSettings> {
  try {
    const raw = await fs.readFile(settingsPath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<AiSettings>;
    return { ...DEFAULT_AI_SETTINGS, ...parsed };
  } catch {
    if (isServerlessReadonlyFs()) {
      warnReadonlyFs("ai-settings:read-fallback");
      return DEFAULT_AI_SETTINGS;
    }
    const dir = path.dirname(settingsPath);
    await fs.mkdir(dir, { recursive: true });
    await writeSettings(DEFAULT_AI_SETTINGS);
    return DEFAULT_AI_SETTINGS;
  }
}

async function writeSettings(settings: AiSettings) {
  if (isServerlessReadonlyFs()) {
    warnReadonlyFs("ai-settings:write");
    return;
  }
  const tmpPath = `${settingsPath}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(settings, null, 2), "utf-8");
  await fs.rename(tmpPath, settingsPath);
}

export async function getAiSettings(): Promise<AiSettings> {
  if (isKvConfigured()) {
    const kvSettings = await readSettingsFromKv();
    if (kvSettings) {
      return { ...DEFAULT_AI_SETTINGS, ...kvSettings };
    }
    try {
      await writeSettingsToKv(DEFAULT_AI_SETTINGS);
    } catch {
      // ignore KV write errors
    }
    return DEFAULT_AI_SETTINGS;
  }
  return ensureFile();
}

export async function setAiSettings(patch: Partial<AiSettings>): Promise<AiSettings> {
  const current = await getAiSettings();
  const updated: AiSettings = { ...current, ...patch };
  if (isKvConfigured()) {
    await writeSettingsToKv(updated);
    return updated;
  }
  await writeSettings(updated);
  return updated;
}
