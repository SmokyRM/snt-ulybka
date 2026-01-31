import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { listAuditLogs } from "@/lib/mockDb";
import { listAuditLog } from "@/lib/auditLog.store";

const isValidPeriod = (period: string) => /^\d{4}-\d{2}$/.test(period);

export async function GET(request: Request, context: { params: { period: string } }) {
  const guard = await requirePermission(request, "billing.generate", {
    route: "/api/office/billing/period-close/[period]/changes",
    deniedReason: "billing.generate",
  });
  if (guard instanceof Response) return guard;

  try {
    const period = context.params.period;
    if (!isValidPeriod(period)) {
      return fail(request, "validation_error", "Период обязателен (YYYY-MM)", 400);
    }
    const adminLogs = listAuditLogs({ limit: 200 }).filter((log) => {
      const meta = log.meta as Record<string, unknown> | undefined;
      return Boolean(meta?.postCloseChange) && meta?.period === period;
    });

    const penaltyLogs = listAuditLog({ limit: 200 }).filter((entry) => {
      const details = entry.details as Record<string, unknown> | undefined;
      return Boolean(details?.postCloseChange) && details?.period === period;
    });

    const items = [
      ...adminLogs.map((log) => ({
        id: log.id,
        action: log.action,
        entity: log.entity,
        createdAt: log.createdAt,
        meta: log.meta ?? undefined,
      })),
      ...penaltyLogs.map((entry) => ({
        id: entry.id,
        action: entry.action,
        entity: entry.targetType,
        createdAt: entry.createdAt,
        meta: entry.details ?? undefined,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return ok(request, { items });
  } catch (error) {
    return serverError(request, "Ошибка загрузки изменений", error);
  }
}
