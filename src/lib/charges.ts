import fs from "fs/promises";
import path from "path";

export type ChargeType = "membership" | "target" | "electricity";
export type ChargeStatus = "unpaid" | "paid";

export type Charge = {
  id: string;
  userId: string;
  type: ChargeType;
  amount: number;
  period: string; // YYYY-MM
  createdAt: string;
  decisionId: string;
  status: ChargeStatus;
};

const filePath = path.join(process.cwd(), "data", "charges.json");

async function writeCharges(items: Charge[]) {
  const tmp = `${filePath}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(items, null, 2), "utf-8");
  await fs.rename(tmp, filePath);
}

async function readCharges(): Promise<Charge[]> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as Charge[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await writeCharges([]);
    return [];
  }
}

const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export async function getUserCharges(userId: string) {
  if (!userId) return [];
  const charges = await readCharges();
  return charges.filter((c) => c.userId === userId).sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
}

export async function getAllCharges() {
  return readCharges();
}

export async function addCharge(input: {
  userId: string;
  type: ChargeType;
  amount: number;
  period: string;
  decisionId: string;
}) {
  if (!input.userId || !input.type || !Number.isFinite(input.amount) || input.amount < 0 || !input.period || !input.decisionId) return;
  const charges = await readCharges();
  const now = new Date().toISOString();
  const item: Charge = {
    id: makeId(),
    userId: input.userId,
    type: input.type,
    amount: input.amount,
    period: input.period,
    decisionId: input.decisionId,
    createdAt: now,
    status: "unpaid",
  };
  charges.unshift(item);
  await writeCharges(charges);
}

export async function markChargePaid(id: string) {
  if (!id) return;
  const charges = await readCharges();
  const idx = charges.findIndex((c) => c.id === id);
  if (idx === -1) return;
  charges[idx] = { ...charges[idx], status: "paid" };
  await writeCharges(charges);
}
