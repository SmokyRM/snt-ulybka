import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import { getSessionUser } from "@/lib/session.server";

type LogPayload = {
  questionType: string;
  hasDebt: boolean;
  plotsCount: number;
  membershipStatus: string;
  ts: string;
};

const LOG_PATH = path.join(process.cwd(), "data", "ai-helper-log.json");

const readLog = async (): Promise<LogPayload[]> => {
  try {
    const raw = await fs.readFile(LOG_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LogPayload[]) : [];
  } catch {
    return [];
  }
};

const writeLog = async (items: LogPayload[]) => {
  await fs.mkdir(path.dirname(LOG_PATH), { recursive: true });
  const tmp = `${LOG_PATH}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(items, null, 2), "utf-8");
  await fs.rename(tmp, LOG_PATH);
};

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  const role = sessionUser?.role ?? "member";

  let payload: LogPayload | null = null;
  try {
    payload = (await request.json()) as LogPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  if (!payload?.questionType) {
    return NextResponse.json({ ok: false, error: "Missing questionType" }, { status: 400 });
  }

  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: true, role });
  }

  const items = await readLog();
  items.unshift({
    ...payload,
    ts: payload.ts || new Date().toISOString(),
  });
  await writeLog(items.slice(0, 500));

  return NextResponse.json({ ok: true, role });
}
