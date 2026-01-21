import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import { listUnifiedBillingPeriods, listPeriodAccruals } from "@/lib/mockDb";
import { ok, unauthorized, forbidden, serverError } from "@/lib/api/respond";

/** Список периодов с итогами: accrualsCount, totalAccrued, totalPaid. Admin + office. */
export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized(request);
    if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
      return forbidden(request);
    }

    const all = listUnifiedBillingPeriods();

    const periods = all.map((p) => {
      const accruals = listPeriodAccruals(p.id);
      const accrualsCount = accruals.length;
      const totalAccrued = accruals.reduce((s, a) => s + a.amountAccrued, 0);
      const totalPaid = accruals.reduce((s, a) => s + (a.amountPaid ?? 0), 0);
      return {
        id: p.id,
        title: p.title,
        from: p.from,
        to: p.to,
        status: p.status,
        createdAt: p.createdAt,
        accrualsCount,
        totalAccrued,
        totalPaid,
      };
    });

    return ok(request, { periods });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
