import { ok, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { buildResidentBillingSummary } from "@/lib/cabinet/billing.server";
import { isResidentRole } from "@/lib/rbac";
import { getEffectiveSessionUser } from "@/lib/session.server";

export async function GET(request: Request) {
  const session = await getEffectiveSessionUser().catch(() => null);
  if (!session) {
    return unauthorized(request);
  }
  if (!isResidentRole(session.role)) {
    return forbidden(request);
  }

  try {
    const summary = buildResidentBillingSummary(session.id);
    const periods = summary.periods.map((period) => ({
      period: period.period,
      accrued: period.accrued,
      paid: period.paid,
      debt: period.debt,
      downloadUrl: `/api/cabinet/receipts/${period.period}.pdf`,
    }));
    return ok(request, { periods, count: periods.length });
  } catch (error) {
    return serverError(request, "Не удалось загрузить квитанции", error);
  }
}
