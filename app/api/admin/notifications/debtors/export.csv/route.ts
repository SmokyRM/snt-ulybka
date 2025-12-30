import { NextResponse } from "next/server";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { getAccrualDebtors } from "../utils";
import { logAdminAction } from "@/lib/audit";

const toCsvValue = (value: string | number) => {
  const str = typeof value === "number" ? value.toString() : value;
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
};

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasFinanceAccess(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const type = (url.searchParams.get("type") as "membership" | "electricity" | null) ?? "membership";
  const period = url.searchParams.get("period");

  const { items, periodLabel, error } = getAccrualDebtors(type, period);
  if (error) return NextResponse.json({ error }, { status: 400 });
  const totalDebt = items.reduce((sum, i) => sum + i.debt, 0);

  const header = ["Улица", "Участок", "ФИО", "Начислено", "Оплачено", "Долг", "Текст"];
  const rows = items.map((i) =>
    [
      toCsvValue(i.street),
      toCsvValue(i.number),
      toCsvValue(i.ownerName),
      toCsvValue(i.amountAccrued.toFixed(2)),
      toCsvValue(i.amountPaid.toFixed(2)),
      toCsvValue(i.debt.toFixed(2)),
      toCsvValue(i.text),
    ].join(";")
  );
  const content = ["\uFEFF" + header.map(toCsvValue).join(";"), ...rows].join("\r\n");

  await logAdminAction({
    action: "export_debtors_csv",
    entity: "debt_notifications",
    after: { type, period: periodLabel, count: items.length, totalDebt },
    meta: {
      period: periodLabel,
      type,
      rowsCount: items.length,
      totals: { totalDebt },
    },
  });

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="debtors_${type}_${periodLabel}.csv"`,
    },
  });
}
