import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session.server";
import { logAdminAction } from "@/lib/audit";
import { getDebtsData, DebtTypeFilter } from "@/lib/debts";

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
  const period = url.searchParams.get("period");
  const type = (url.searchParams.get("type") as DebtTypeFilter | null) ?? "all";
  const minDebt = url.searchParams.get("minDebt");
  const q = url.searchParams.get("q");
  const onlyUnnotified = url.searchParams.get("onlyUnnotified") === "1";

  const { items, error } = getDebtsData({
    period,
    type,
    minDebt: minDebt ? Number(minDebt) : null,
    q,
    onlyUnnotified,
  });
  if (error) return NextResponse.json({ error }, { status: 400 });

  const header = [
    "Улица",
    "Участок",
    "ФИО",
    "Долг (членские)",
    "Долг (целевые)",
    "Долг (электро)",
    "Долг всего",
    "Статус",
  ];
  const rows = items.map((i) =>
    [
      toCsvValue(i.street),
      toCsvValue(i.number),
      toCsvValue(i.ownerName),
      toCsvValue(i.debtMembership.toFixed(2)),
      toCsvValue(i.debtTarget.toFixed(2)),
      toCsvValue(i.debtElectricity.toFixed(2)),
      toCsvValue(i.debtTotal.toFixed(2)),
      toCsvValue(i.notificationStatus ?? "new"),
    ].join(";")
  );
  const content = ["\uFEFF" + header.map(toCsvValue).join(";"), ...rows].join("\r\n");
  const filename = `debts_${type}_${period ?? "period"}.csv`;

  await logAdminAction({
    action: "export_debts_csv",
    entity: "debts",
    after: { type, period, count: items.length },
  });

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
