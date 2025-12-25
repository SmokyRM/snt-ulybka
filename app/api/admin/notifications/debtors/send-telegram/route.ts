import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session.server";
import { getAccrualDebtors } from "../utils";
import { sendTelegramMessage } from "@/lib/telegram";
import { logAdminAction } from "@/lib/audit";

const chunkMessages = (lines: string[], header: string) => {
  const chunks: string[] = [];
  const maxLines = 30;
  for (let i = 0; i < lines.length; i += maxLines) {
    const slice = lines.slice(i, i + maxLines);
    chunks.push([header, ...slice].join("\n"));
  }
  return chunks;
};

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const type = (body.type as "membership" | "electricity" | undefined) ?? "membership";
  const period = body.period as string | undefined;

  const { items, periodLabel, error } = getAccrualDebtors(type, period ?? null);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const totalDebt = items.reduce((sum, i) => sum + i.debt, 0);
  const header = `СНТ «Улыбка» — должники (${type === "membership" ? "взносы" : "электроэнергия"}) за ${periodLabel}`;
  const summary = `Всего: ${items.length}, долг: ${totalDebt.toFixed(2)} ₽`;

  const lines = items.map((i) => `${i.street}-${i.number} — ${i.debt.toFixed(2)} ₽ (${i.notificationStatus ?? "new"})`);
  const messages = chunkMessages(lines, `${header}\n${summary}`);

  let sent = 0;
  for (const msg of messages) {
    await sendTelegramMessage(msg);
    sent += 1;
  }

  await logAdminAction({
    action: "send_debt_notifications_telegram",
    entity: "debt_notifications",
    after: { type, period: periodLabel, count: items.length, totalDebt, sentMessages: sent },
  });

  return NextResponse.json({ ok: true, sentMessages: sent });
}
