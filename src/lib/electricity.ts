import fs from "fs/promises";
import path from "path";

export type ElectricityEntry = {
  userId: string;
  plotNumber: string;
  lastReading: number | null;
  lastReadingDate: string | null;
  debt: number | null;
  notified: boolean;
  notifiedAt: string | null;
  history?: Array<{ reading: number; date: string }>;
};

const filePath = path.join(process.cwd(), "data", "electricity.json");

async function readAll(): Promise<ElectricityEntry[]> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<ElectricityEntry>[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      userId: item.userId ?? "",
      plotNumber: item.plotNumber ?? "—",
      lastReading: item.lastReading ?? null,
      lastReadingDate: item.lastReadingDate ?? null,
      debt: item.debt ?? null,
      notified: item.notified ?? false,
      notifiedAt: item.notifiedAt ?? null,
      history: Array.isArray(item.history) ? item.history : [],
    }));
  } catch {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await writeAll([]);
    return [];
  }
}

async function writeAll(items: ElectricityEntry[]) {
  const tmp = `${filePath}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(items, null, 2), "utf-8");
  await fs.rename(tmp, filePath);
}

export async function getUserElectricity(userId: string) {
  if (!userId) return null;
  const items = await readAll();
  return items.find((i) => i.userId === userId) ?? null;
}

export async function getAllElectricity() {
  return readAll();
}

export async function submitReading(userId: string, value: number) {
  if (!userId || !Number.isFinite(value) || value < 0) return null;
  const items = await readAll();
  const idx = items.findIndex((i) => i.userId === userId);
  const now = new Date().toISOString();
  if (idx === -1) {
    const entry: ElectricityEntry = {
      userId,
      plotNumber: "—",
      lastReading: value,
      lastReadingDate: now,
      debt: null,
      notified: false,
      notifiedAt: null,
      history: [{ reading: value, date: now }],
    };
    items.push(entry);
    await writeAll(items);
    return entry;
  }
  const updated: ElectricityEntry = {
    ...items[idx],
    lastReading: value,
    lastReadingDate: now,
    history: [
      ...(Array.isArray(items[idx].history) ? items[idx].history : []),
      { reading: value, date: now },
    ],
    notified: items[idx].notified ?? false,
    notifiedAt: items[idx].notifiedAt ?? null,
  };
  items[idx] = updated;
  await writeAll(items);
  return updated;
}

export async function markNotified(userIds: string[]) {
  if (!Array.isArray(userIds) || userIds.length === 0) return;
  const ids = new Set(userIds.filter(Boolean));
  if (ids.size === 0) return;
  const items = await readAll();
  const now = new Date().toISOString();
  let changed = false;
  const updated = items.map((item) => {
    if (!ids.has(item.userId)) return item;
    changed = true;
    return { ...item, notified: true, notifiedAt: now };
  });
  if (changed) await writeAll(updated);
}

export async function clearNotified(userIds: string[]) {
  if (!Array.isArray(userIds) || userIds.length === 0) return;
  const ids = new Set(userIds.filter(Boolean));
  if (ids.size === 0) return;
  const items = await readAll();
  let changed = false;
  const updated = items.map((item) => {
    if (!ids.has(item.userId)) return item;
    changed = true;
    return { ...item, notified: false, notifiedAt: null };
  });
  if (changed) await writeAll(updated);
}

export async function getUserElectricityHistory(userId: string, months = 6) {
  if (!userId) return [];
  const entry = await getUserElectricity(userId);
  if (!entry) return [];
  const history = Array.isArray(entry.history) ? entry.history : [];
  const sorted = [...history].sort((a, b) => (a.date > b.date ? -1 : 1)).slice(0, months);
  return sorted.map((h) => {
    const month = h.date ? h.date.slice(0, 7) : "";
    return { month, reading: h.reading, date: h.date };
  });
}
