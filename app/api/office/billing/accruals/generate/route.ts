import { ok, fail, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { generateAccruals } from "@/lib/billing.store";
import { assertPeriodOpenOrReason } from "@/lib/office/periodClose.store";
import { logAdminAction } from "@/lib/audit";

export async function POST(request: Request) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/billing/accruals/generate",
      role: null,
      userId: null,
      status: 401,
      latencyMs: Date.now() - startedAt,
      error: "UNAUTHORIZED",
    });
    return unauthorized(request);
  }

  if (!isStaffOrAdmin(role)) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/billing/accruals/generate",
      role,
      userId: session.id ?? null,
      status: 403,
      latencyMs: Date.now() - startedAt,
      error: "FORBIDDEN",
    });
    return forbidden(request);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const period = typeof body.period === "string" ? body.period : null;
    const category = typeof body.category === "string" ? body.category : null;
    const tariff = typeof body.tariff === "number" ? body.tariff : body.tariff ? Number(body.tariff) : null;
    const fixedAmount = typeof body.fixedAmount === "number" ? body.fixedAmount : body.fixedAmount ? Number(body.fixedAmount) : null;
    const plotIds = Array.isArray(body.plotIds)
      ? body.plotIds.filter((id: unknown): id is string => typeof id === "string")
      : null;
    const plotQuery = typeof body.plotQuery === "string" ? body.plotQuery : null;
    const reason = typeof body.reason === "string" ? body.reason : null;

    if (!period || !category) {
      return fail(request, "validation_error", "period и category обязательны", 400);
    }

    if (category !== "membership" && category !== "electricity" && category !== "target") {
      return fail(request, "validation_error", "Неверная категория", 400);
    }

    let closeCheck: { closed: false } | { closed: true; reason: string };
    try {
      closeCheck = assertPeriodOpenOrReason(period, reason);
    } catch (e) {
      return fail(request, "period_closed", e instanceof Error ? e.message : "Период закрыт", 409);
    }

    const result = generateAccruals({ period, category, tariff, fixedAmount, plotIds, plotQuery });

    await logAdminAction({
      action: "accruals.generate",
      entity: "billing.accruals",
      entityId: period,
      route: "/api/office/billing/accruals/generate",
      success: true,
      meta: closeCheck.closed ? { period, category, postCloseChange: true, reason: closeCheck.reason } : { period, category },
      headers: request.headers,
    });
    return ok(request, result);
  } catch (error) {
    return serverError(request, "Ошибка генерации начислений", error);
  }
}
