import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session.server";
import { getElectricityReport } from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";

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

  const report = getElectricityReport(year, month);
  await logAdminAction({
    action: "view_electricity_report",
    entity: "electricity_report",
    after: { year, month, count: report.length },
    actorUserId: user.id ?? null,
    actorRole: user.role,
  });
  return NextResponse.json({ items: report });
}
