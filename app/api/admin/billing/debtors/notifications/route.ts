import { NextResponse } from "next/server";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import {
  listDebtNotificationHistory,
  updateDebtNotificationHistory,
  findDebtNotificationHistoryById,
} from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";
import { ok, unauthorized, forbidden, badRequest, fail, serverError } from "@/lib/api/respond";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized(request);
    if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
      return forbidden(request);
    }

  const { searchParams } = new URL(request.url);
  const plotId = searchParams.get("plotId") || null;
  const periodId = searchParams.get("periodId") || null;
  const status = searchParams.get("status") as "draft" | "sent_manually" | "cancelled" | null;

    const history = listDebtNotificationHistory({
      plotId: plotId || undefined,
      periodId: periodId || undefined,
      status: status || undefined,
    });

    return ok(request, { history });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized(request);
    if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
      return forbidden(request);
    }

    const body = await request.json().catch(() => ({}));
    const { id, status } = body;

    if (!id) {
      return badRequest(request, "id is required");
    }

    const existing = findDebtNotificationHistoryById(id);
    if (!existing) {
      return fail(request, "not_found", "notification not found", 404);
    }

    const updated = updateDebtNotificationHistory(id, {
      status: status || existing.status,
      sentAt: status === "sent_manually" ? new Date().toISOString() : existing.sentAt,
      sentByUserId: status === "sent_manually" ? user.id ?? null : existing.sentByUserId,
    });

    if (!updated) {
      return serverError(request, "failed to update");
    }

    await logAdminAction({
      action: "update_debt_notification_history",
      entity: "debt_notification_history",
      entityId: id,
      before: { status: existing.status },
      after: { status: updated.status, sentAt: updated.sentAt },
      meta: { actorUserId: user?.id ?? null, actorRole: user?.role ?? null },
      headers: request.headers,
    });

    return ok(request, { notification: updated });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
