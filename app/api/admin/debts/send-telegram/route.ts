import { NextResponse } from "next/server";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { logAdminAction } from "@/lib/audit";
import { getDebtsData, DebtTypeFilter } from "@/lib/debts";
import { sendTelegramMessage } from "@/lib/telegram";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    if (!hasFinanceAccess(user)) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const period = (body.period as string | undefined) ?? null;
    const type = (body.type as DebtTypeFilter | undefined) ?? "all";
    const minDebt = typeof body.minDebt === "number" ? body.minDebt : null;
    const onlyUnnotified = body.onlyUnnotified === true;
    const q = typeof body.q === "string" ? body.q : null;

    const { items, error } = getDebtsData({ period, type, minDebt, onlyUnnotified, q });
    if (error) return NextResponse.json({ ok: false, error }, { status: 400 });

    const totals = items.reduce(
      (acc, i) => ({
        totalDebt: acc.totalDebt + i.debtTotal,
        membership: acc.membership + i.debtMembership,
        target: acc.target + i.debtTarget,
        electricity: acc.electricity + i.debtElectricity,
      }),
      { totalDebt: 0, membership: 0, target: 0, electricity: 0 }
    );
    const header = `СНТ «Улыбка» — долги (${type}) за ${period}`;
    const summary = `Всего: ${items.length}, долг: ${totals.totalDebt.toFixed(2)} ₽`;
    const lines = items.slice(0, 30).map((i) => `${i.street}-${i.number}: ${i.debtTotal.toFixed(2)} ₽ (${i.notificationStatus})`);
    const extra = items.length > 30 ? `…и ещё ${items.length - 30}` : "";
    const message = [header, summary, ...lines, extra].filter(Boolean).join("\n");
    await sendTelegramMessage(message);

    await logAdminAction({
      action: "export_debts_telegram",
      entity: "debts",
      after: {
        type,
        period,
        count: items.length,
        totalDebt: totals.totalDebt,
        sentCount: 1,
        skippedCount: 0,
        errorCount: 0,
      },
      meta: {
        period,
        type,
        rowsCount: items.length,
        totals,
        telegram: { sentCount: 1, skippedCount: 0, errorCount: 0 },
      },
    });

    return NextResponse.json({ ok: true, sent: 1, skipped: 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    await logAdminAction({
      action: "export_debts_telegram",
      entity: "debts",
      after: { errorMessage: message, sentCount: 0, skippedCount: 0, errorCount: 1 },
      meta: {
        telegram: { sentCount: 0, skippedCount: 0, errorCount: 1, errorMessage: message },
      },
    });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
