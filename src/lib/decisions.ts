import fs from "fs/promises";
import path from "path";

export type Decision = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  docUrl: string;
  notes: string | null;
};

const filePath = path.join(process.cwd(), "data", "decisions.json");

async function writeDecisions(items: Decision[]) {
  const tmp = `${filePath}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(items, null, 2), "utf-8");
  await fs.rename(tmp, filePath);
}

async function readDecisions(): Promise<Decision[]> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as Decision[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await writeDecisions([]);
    return [];
  }
}

const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export async function getDecisions(): Promise<Decision[]> {
  return readDecisions();
}

export async function addDecision(input: {
  title: string;
  date: string;
  docUrl: string;
  notes?: string | null;
}) {
  if (!input.title || !input.date || !input.docUrl) return;
  const decisions = await readDecisions();
  const item: Decision = {
    id: makeId(),
    title: input.title,
    date: input.date,
    docUrl: input.docUrl,
    notes: input.notes ?? null,
  };
  decisions.unshift(item);
  await writeDecisions(decisions);
}

export async function deleteDecision(id: string) {
  if (!id) return;
  const decisions = await readDecisions();
  const filtered = decisions.filter((d) => d.id !== id);
  await writeDecisions(filtered);
}
