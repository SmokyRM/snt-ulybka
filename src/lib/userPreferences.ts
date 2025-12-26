import fs from "fs/promises";
import path from "path";
import { getUserPlots } from "@/lib/plots";

export type UserPreferences = {
  userId: string;
  activePlotId: string | null;
  updatedAt: string;
};

const prefsPath = path.join(process.cwd(), "data", "user-preferences.json");

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

export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  if (!userId) return { userId: "", activePlotId: null, updatedAt: new Date().toISOString() };
  const prefs = await readJson<UserPreferences[]>(prefsPath, []);
  const found = prefs.find((p) => p.userId === userId);
  if (found) return found;
  return { userId, activePlotId: null, updatedAt: new Date().toISOString() };
}

export async function setActivePlot(userId: string, plotId: string) {
  if (!userId || !plotId) return;
  const plots = await getUserPlots(userId);
  const allowed = plots.some((p) => p.plotId === plotId && p.status === "active");
  if (!allowed) return;
  const prefs = await readJson<UserPreferences[]>(prefsPath, []);
  const now = new Date().toISOString();
  const idx = prefs.findIndex((p) => p.userId === userId);
  const record: UserPreferences = { userId, activePlotId: plotId, updatedAt: now };
  if (idx === -1) {
    prefs.push(record);
  } else {
    prefs[idx] = record;
  }
  await writeJson(prefsPath, prefs);
}
