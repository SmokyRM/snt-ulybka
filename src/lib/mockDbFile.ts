import { promises as fs } from "fs";
import path from "path";
import { MockDbSnapshot, setMockDbSnapshot } from "@/lib/mockDb";

const getMockDbPath = () => path.join(process.cwd(), "data", "mockdb.json");

const isDevRuntime = () => process.env.NODE_ENV !== "production";

const isValidSnapshot = (value: unknown): value is MockDbSnapshot => {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as MockDbSnapshot;
  return (
    Array.isArray(snapshot.users) &&
    Array.isArray(snapshot.plots) &&
    Array.isArray(snapshot.accrualPeriods) &&
    Array.isArray(snapshot.accrualItems) &&
    Array.isArray(snapshot.payments)
  );
};

export const loadMockDbFromFile = async (): Promise<MockDbSnapshot | null> => {
  if (!isDevRuntime()) return null;
  try {
    const raw = await fs.readFile(getMockDbPath(), "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidSnapshot(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const ensureMockDbFromFile = async () => {
  if (!isDevRuntime()) return;
  const g = globalThis as typeof globalThis & { __SNT_DB_FILE_LOADED__?: boolean };
  if (g.__SNT_DB_FILE_LOADED__) return;
  const snapshot = await loadMockDbFromFile();
  if (snapshot) {
    setMockDbSnapshot(snapshot);
  }
  g.__SNT_DB_FILE_LOADED__ = true;
};

export const saveMockDbToFile = async (snapshot: MockDbSnapshot) => {
  if (!isDevRuntime()) return;
  const filePath = getMockDbPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2), "utf-8");
};
