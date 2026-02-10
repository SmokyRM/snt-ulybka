export const runtime = "nodejs";

import { ok, fail, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { assertCan } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/auditLog.pg";
import { getRequestId } from "@/lib/api/requestId";
import { hasPgConnection, bulkUpdatePaymentStatus, bulkUpdatePaymentMatchStatus } from "@/lib/billing/bulk.pg";

const MAX_BULK_SIZE = 200;

type BulkPaymentAction = "mark_outside_snt" | "mark_void" | "mark_ignored" | "mark_manual";

const STATUS_MAP: Record<BulkPaymentAction, { status?: string; matchStatus?: string }> = {
  mark_outside_snt: { status: "outside_snt" },
  mark_void: { status: "void" },
  mark_ignored: { matchStatus: "ignored" },
  mark_manual: { matchStatus: "manual" },
};

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const session = await getEffectiveSessionUser().catch(() => null);

  if (!session) {
    return unauthorized(request);
  }

  const role = (session.role as Role | undefined) ?? "resident";

  try {
    assertCan(role, "finance.write");
  } catch {
    await logAuditEvent({
      actorUserId: session.id ?? null,
      actorRole: role,
      action: "bulk_payment_update",
      entityType: "payment",
      route: "/api/office/bulk/payments",
      success: false,
      deniedReason: "insufficient_permissions",
      requestId,
    });
    return forbidden(request);
  }

  if (!hasPgConnection()) {
    return fail(request, "no_pg", "Операция доступна только с PostgreSQL", 501);
  }

  try {
    const body = await request.json();
    const { ids, action, confirmToken, reason } = body as {
      ids?: string[];
      action?: BulkPaymentAction;
      confirmToken?: string;
      reason?: string;
    };

    // Validation
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return fail(request, "validation_error", "Не выбраны записи для обновления", 400);
    }

    if (ids.length > MAX_BULK_SIZE) {
      return fail(request, "limit_exceeded", `Максимум ${MAX_BULK_SIZE} записей за один запрос`, 413);
    }

    if (!action || !STATUS_MAP[action]) {
      return fail(request, "validation_error", "Неизвестное действие", 400);
    }

    // Confirm token validation for destructive actions
    if (action === "mark_void" && confirmToken !== "CONFIRM") {
      return fail(request, "confirmation_required", "Для подтверждения введите CONFIRM", 400);
    }

    const statusConfig = STATUS_MAP[action];

    let result: { updated: number; ids: string[] };

    if (statusConfig.status) {
      result = await bulkUpdatePaymentStatus({
        ids,
        status: statusConfig.status,
        reason,
      });
    } else if (statusConfig.matchStatus) {
      result = await bulkUpdatePaymentMatchStatus({
        ids,
        matchStatus: statusConfig.matchStatus,
      });
    } else {
      return fail(request, "invalid_action", "Действие не поддерживается", 400);
    }

    // Audit log
    await logAuditEvent({
      actorUserId: session.id ?? null,
      actorRole: role,
      action: `bulk_payment_${action}`,
      entityType: "payment",
      route: "/api/office/bulk/payments",
      success: true,
      requestId,
      meta: {
        action,
        requestedCount: ids.length,
        updatedCount: result.updated,
        updatedIds: result.ids,
        reason: reason ?? null,
      },
    });

    return ok(request, {
      updated: result.updated,
      message: `Обновлено записей: ${result.updated}`,
    });
  } catch (error) {
    await logAuditEvent({
      actorUserId: session.id ?? null,
      actorRole: role,
      action: "bulk_payment_update",
      entityType: "payment",
      route: "/api/office/bulk/payments",
      success: false,
      deniedReason: error instanceof Error ? error.message : "unknown_error",
      requestId,
    });

    if (error instanceof Error && error.message.includes("лимит")) {
      return fail(request, "limit_exceeded", error.message, 413);
    }

    return serverError(request, "Ошибка при массовом обновлении", error);
  }
}
