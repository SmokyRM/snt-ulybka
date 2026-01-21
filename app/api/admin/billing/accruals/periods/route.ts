import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { isAdminRole, isOfficeRole } from "@/lib/rbac";
import { listUnifiedBillingPeriods, createUnifiedBillingPeriod } from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";
import { ok, unauthorized, forbidden, badRequest, serverError } from "@/lib/api/respond";

/** Создать период начислений (draft). Формат "2025": один период на год. Admin + office. */
export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized(request);
    if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
      return forbidden(request);
    }

    const body = await request.json().catch(() => ({}));
    const year = typeof body.year === "number" ? body.year : typeof body.year === "string" ? parseInt(body.year, 10) : null;

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return badRequest(request, "year 2000–2100");
    }

    const existing = listUnifiedBillingPeriods().find(
      (p) => p.title === String(year) || (p.from.startsWith(`${year}-`) && p.to.startsWith(`${year}-`))
    );
    if (existing) {
      return badRequest(request, "Период уже существует", { period: existing });
    }

    const period = createUnifiedBillingPeriod({
      from: `${year}-01-01`,
      to: `${year}-12-31`,
      title: String(year),
      status: "draft",
      createdByUserId: user.id ?? null,
    });

    await logAdminAction({
      action: "create_accrual_period",
      entity: "unified_billing_period",
      entityId: period.id,
      after: { year, from: period.from, to: period.to },
      headers: request.headers,
    });

    return ok(request, { period });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
