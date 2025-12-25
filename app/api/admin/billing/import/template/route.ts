import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session.server";

const BOM = "\uFEFF";

const templateRows = [
  ["Дата", "Сумма", "Назначение", "Улица", "Участок", "Номер операции"],
  ["25.12.2025 14:33:00", "1500,00", "Членские взносы ул Березовая уч 12", "Березовая", "12", "1234567890"],
  ["01.01.2026", "2000,00", "Взносы за январь 2026 ул Центральная уч 5", "Центральная", "5", ""],
];

const buildCsv = () => {
  const escape = (val: string) => `"${val.replace(/"/g, '""')}"`;
  return templateRows.map((row) => row.map(escape).join(";")).join("\r\n");
};

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const csv = BOM + buildCsv();
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="payments_template.csv"',
    },
  });
}

