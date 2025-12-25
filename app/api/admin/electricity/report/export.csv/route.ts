import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session.server";
import { getElectricityReport } from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";

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
  const year = Number(url.searchParams.get("year") ?? new Date().getFullYear());
  const month = Number(url.searchParams.get("month") ?? new Date().getMonth() + 1);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Неверный период" }, { status: 400 });
  }

  const items = getElectricityReport(year, month);
  const header = [
    "Улица",
    "Участок",
    "Δ кВт",
    "Начислено",
    "Оплачено",
    "Долг",
  ];
  const rows = items.map((i) =>
    [
      toCsvValue(i.street),
      toCsvValue(i.number),
      toCsvValue(i.deltaKwh ?? 0),
      toCsvValue(i.amountAccrued ?? 0),
      toCsvValue(i.amountPaid ?? 0),
      toCsvValue(i.debt ?? 0),
    ].join(";")
  );
  const content = ["\uFEFF" + header.map(toCsvValue).join(";"), ...rows].join("\r\n");
  const res = new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="electricity_report_${year}-${month.toString().padStart(2, "0")}.csv"`,
    },
  });
  await logAdminAction({
    action: "export_electricity_report",
    entity: "electricity_report",
    after: { year, month, count: items.length },
  });
  return res;
}
