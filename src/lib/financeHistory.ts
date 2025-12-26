import fs from "fs/promises";
import path from "path";

export type FinanceHistoryEntry = {
  userId: string;
  month: string; // YYYY-MM
  charged: number;
  paid: number;
};

const filePath = path.join(process.cwd(), "data", "finance-history.json");

async function readFinance(): Promise<FinanceHistoryEntry[]> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as FinanceHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await writeFinance([]);
    return [];
  }
}

async function writeFinance(items: FinanceHistoryEntry[]) {
  const tmp = `${filePath}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(items, null, 2), "utf-8");
  await fs.rename(tmp, filePath);
}

export async function getUserFinanceHistory(userId: string, months = 6): Promise<FinanceHistoryEntry[]> {
  if (!userId) return [];
  const items = await readFinance();
  return items
    .filter((i) => i.userId === userId)
    .sort((a, b) => (a.month > b.month ? -1 : 1))
    .slice(0, months);
}
