export const runtime = "nodejs";

import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { logAdminAction } from "@/lib/audit";
import { listPenaltyExceptions, createPenaltyException } from "@/lib/billing/penaltyRules.pg";
import { hasPgConnection } from "@/lib/billing/penalty.pg";

export async function GET(request: Request) {
  const guard = await requirePermission(request, "billing.penalty.apply", {
    route: "/api/office/billing/penalties/exceptions",
  });
  if (guard instanceof Response) return guard;

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period");
    if (!hasPgConnection()) {
      return ok(request, { exceptions: [] });
    }
    const exceptions = await listPenaltyExceptions(period);
    return ok(request, { exceptions });
  } catch (error) {
    return serverError(request, "Ошибка загрузки исключений", error);
  }
}

export async function POST(request: Request) {
  const guard = await requirePermission(request, "billing.penalty.apply", {
    route: "/api/office/billing/penalties/exceptions",
  });
  if (guard instanceof Response) return guard;

  try {
    const body = await request.json().catch(() => ({}));
    const plotId = typeof body.plotId === "string" ? body.plotId : null;
    const personId = typeof body.personId === "string" ? body.personId : null;
    const period = typeof body.period === "string" ? body.period : null;
    const reason = typeof body.reason === "string" ? body.reason : null;

    if (!period) {
      return fail(request, "validation_error", "period обязателен", 400);
    }
    if (!plotId && !personId) {
      return fail(request, "validation_error", "Нужен plotId или personId", 400);
    }

    if (!hasPgConnection()) {
      return fail(request, "pg_missing", "Postgres не настроен", 503);
    }

    const exception = await createPenaltyException({
      plotId,
      personId,
      period,
      reason,
      createdBy: guard.session.id ?? null,
    });

    await logAdminAction({
      action: "penalty.exception.create",
      entity: "billing.penalty",
      entityId: exception?.id ?? null,
      route: "/api/office/billing/penalties/exceptions",
      success: true,
      meta: { period, plotId, personId },
      headers: request.headers,
    });

    return ok(request, { exception });
  } catch (error) {
    return serverError(request, "Ошибка сохранения исключения", error);
  }
}
