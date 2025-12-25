import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session.server";
import { listAccrualItems, listAccrualPeriods, listPayments, listPlots } from "@/lib/mockDb";
import { categoryForAccrualType } from "@/lib/paymentCategory";

const toCsvValue = (value: string | number) => {
  const str = typeof value === "number" ? value.toString() : value;
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
};

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const periodId = url.searchParams.get("periodId");
  if (!periodId) return NextResponse.json({ error: "periodId required" }, { status: 400 });

  const period = listAccrualPeriods().find((p) => p.id === periodId);
  if (!period) return NextResponse.json({ error: "period not found" }, { status: 404 });

  const plots = listPlots();
  const items = listAccrualItems(periodId);
  const paymentsByPlot: Record<string, number> = {};
  listPayments({ periodId, includeVoided: false, category: categoryForAccrualType(period.type) }).forEach((p) => {
    paymentsByPlot[p.plotId] = (paymentsByPlot[p.plotId] ?? 0) + p.amount;
  });

  const header = ["Улица", "Участок", "ФИО", "Начислено", "Оплачено", "Долг"];
  const rows = items.map((i) => {
    const plot = plots.find((p) => p.id === i.plotId);
    const paid = paymentsByPlot[i.plotId] ?? 0;
    const debt = i.amountAccrued - paid;
    return [
      toCsvValue(plot?.street ?? ""),
      toCsvValue(plot?.plotNumber ?? ""),
      toCsvValue(plot?.ownerFullName ?? "—"),
      toCsvValue(i.amountAccrued.toFixed(2)),
      toCsvValue(paid.toFixed(2)),
      toCsvValue(debt.toFixed(2)),
    ].join(";");
  });

  const content = ["\uFEFF" + header.map(toCsvValue).join(";"), ...rows].join("\r\n");
  const filename = `billing_${period.type}_${period.year}-${String(period.month).padStart(2, "0")}.csv`;
  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
