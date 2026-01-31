import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { closePeriod, computePeriodAggregates, getPeriodClose } from "@/lib/office/periodClose.store";
import { logAdminAction } from "@/lib/audit";

const isValidPeriod = (period: string) => /^\d{4}-\d{2}$/.test(period);

export async function GET(request: Request) {
  const guard = await requirePermission(request, "billing.generate", {
    route: "/api/office/billing/period-close",
    deniedReason: "billing.generate",
  });
  if (guard instanceof Response) return guard;

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") ?? "";
    if (!isValidPeriod(period)) {
      return fail(request, "validation_error", "Период обязателен (YYYY-MM)", 400);
    }
    const record = getPeriodClose(period);
    const current = computePeriodAggregates(period);
    return ok(request, {
      period,
      status: record?.status ?? "open",
      closedAt: record?.closedAt ?? null,
      closedBy: record?.closedBy ?? null,
      snapshot: record?.snapshot ?? null,
      current,
    });
  } catch (error) {
    return serverError(request, "Ошибка загрузки периода", error);
  }
}

export async function POST(request: Request) {
  const guard = await requirePermission(request, "billing.generate", {
    route: "/api/office/billing/period-close",
    deniedReason: "billing.generate",
  });
  if (guard instanceof Response) return guard;
  const session = guard.session;

  try {
    const body = await request.json().catch(() => ({}));
    const period = typeof body.period === "string" ? body.period : "";
    if (!isValidPeriod(period)) {
      return fail(request, "validation_error", "Период обязателен (YYYY-MM)", 400);
    }

    const record = closePeriod({ period, closedBy: session?.id ?? null });

    await logAdminAction({
      action: "period.close",
      entity: "billing.period",
      entityId: period,
      route: "/api/office/billing/period-close",
      success: true,
      meta: { period },
      headers: request.headers,
    });

    return ok(request, { record });
  } catch (error) {
    return serverError(request, "Ошибка закрытия периода", error);
  }
}
