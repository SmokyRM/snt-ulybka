import { ok, fail, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { previewAccruals } from "@/lib/billing.store";

export async function POST(request: Request) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/billing/accruals/preview",
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
      path: "/api/office/billing/accruals/preview",
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

    if (!period || !category) {
      return fail(request, "validation_error", "period и category обязательны", 400);
    }

    if (category !== "membership" && category !== "electricity" && category !== "target") {
      return fail(request, "validation_error", "Неверная категория", 400);
    }

    const rows = previewAccruals({ period, category, tariff, fixedAmount, plotIds, plotQuery });
    const totalAmount = rows.reduce((sum, row) => sum + row.amount, 0);
    return ok(request, {
      totals: { count: rows.length, totalAmount },
      rows: rows.slice(0, 5),
    });
  } catch (error) {
    return serverError(request, "Ошибка предпросмотра начислений", error);
  }
}
