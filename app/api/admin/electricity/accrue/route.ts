import { NextResponse } from "next/server";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { accrueElectricityForPeriod } from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasAdminAccess(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const year = Number(body.year);
  const month = Number(body.month);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Неверный период" }, { status: 400 });
  }

  try {
    const result = accrueElectricityForPeriod({ year, month });
    await logAdminAction({
      action: "accrue_electricity",
      entity: "accrual_period",
      entityId: result.period.id,
      after: {
        year,
        month,
        tariff: result.tariff,
        updatedCount: result.updatedCount,
      },
    });
    return NextResponse.json({
      ok: true,
      period: result.period,
      tariff: result.tariff,
      updatedCount: result.updatedCount,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
