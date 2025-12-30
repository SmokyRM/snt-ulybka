import { NextResponse } from "next/server";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
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
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    if (!hasFinanceAccess(user)) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const type = (body.type as "membership" | "electricity" | undefined) ?? "membership";
    const period = body.period as string | undefined;

    const { items, periodLabel, error } = getAccrualDebtors(type, period ?? null);
    if (error) return NextResponse.json({ ok: false, error }, { status: 400 });

    if (items.length === 0) {
      await logAdminAction({
        action: "export_debtors_telegram",
        entity: "debt_notifications",
        after: { type, period: periodLabel, count: 0, totalDebt: 0, sentCount: 0, skippedCount: 0, errorCount: 0 },
        meta: {
          period: periodLabel,
          type,
          rowsCount: 0,
          totals: { totalDebt: 0 },
          telegram: { sentCount: 0, skippedCount: 0, errorCount: 0 },
        },
      });
      return NextResponse.json({
        ok: true,
        sentMessages: 0,
        skipped: 0,
        message: "Нет должников за выбранный период",
      });
    }

    const totalDebt = items.reduce((sum, i) => sum + i.debt, 0);
    const header = `СНТ «Улыбка» — должники (${type === "membership" ? "взносы" : "электроэнергия"}) за ${periodLabel}`;
    const summary = `Всего: ${items.length}, долг: ${totalDebt.toFixed(2)} ₽`;

    const lines = items.map(
      (i) => `${i.street}-${i.number} — ${i.debt.toFixed(2)} ₽ (${i.notificationStatus ?? "new"})`
    );
    const messages = chunkMessages(lines, `${header}\n${summary}`);

    let sent = 0;
    for (const msg of messages) {
      await sendTelegramMessage(msg);
      sent += 1;
    }

    await logAdminAction({
      action: "export_debtors_telegram",
      entity: "debt_notifications",
      after: {
        type,
        period: periodLabel,
        count: items.length,
        totalDebt,
        sentCount: sent,
        skippedCount: 0,
        errorCount: 0,
      },
      meta: {
        period: periodLabel,
        type,
        rowsCount: items.length,
        totals: { totalDebt },
        telegram: { sentCount: sent, skippedCount: 0, errorCount: 0 },
      },
    });

    return NextResponse.json({ ok: true, sentMessages: sent, skipped: 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    await logAdminAction({
      action: "export_debtors_telegram",
      entity: "debt_notifications",
      after: { errorMessage: message, sentCount: 0, skippedCount: 0, errorCount: 1 },
      meta: {
        telegram: { sentCount: 0, skippedCount: 0, errorCount: 1, errorMessage: message },
      },
    });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
