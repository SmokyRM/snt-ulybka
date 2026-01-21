import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { accrueElectricityForPeriod } from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";
import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api/respond";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized(request);
  if (!hasAdminAccess(user)) return forbidden(request);

  const body = await request.json().catch(() => ({}));
  const year = Number(body.year);
  const month = Number(body.month);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return badRequest(request, "Неверный период");
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
    return ok(request, {
      period: result.period,
      tariff: result.tariff,
      updatedCount: result.updatedCount,
    });
  } catch (e) {
    return badRequest(request, (e as Error).message);
  }
}
