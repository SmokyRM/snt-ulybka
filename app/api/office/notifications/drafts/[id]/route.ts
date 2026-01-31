import { ok, fail, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import {
  getNotificationDraft,
  updateNotificationDraft,
  deleteNotificationDraft,
  type NotificationChannel,
} from "@/lib/notificationDrafts.store";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: `/api/office/notifications/drafts/${params.id}`,
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
      path: `/api/office/notifications/drafts/${params.id}`,
      role,
      userId: session.id ?? null,
      status: 403,
      latencyMs: Date.now() - startedAt,
      error: "FORBIDDEN",
    });
    return forbidden(request);
  }

  try {
    const draft = getNotificationDraft(params.id);
    if (!draft) {
      return fail(request, "not_found", "Уведомление не найдено", 404);
    }
    return ok(request, { draft });
  } catch (error) {
    return serverError(request, "Ошибка получения уведомления", error);
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: `/api/office/notifications/drafts/${params.id}`,
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
      path: `/api/office/notifications/drafts/${params.id}`,
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
    const updates: Record<string, unknown> = {};

    if (typeof body.subject === "string") updates.subject = body.subject;
    if (typeof body.body === "string") updates.body = body.body;
    if (typeof body.channel === "string") {
      const channel = body.channel as NotificationChannel;
      if (channel === "telegram" || channel === "email" || channel === "sms" || channel === "print") {
        updates.channel = channel;
      }
    }

    const draft = updateNotificationDraft(params.id, updates);
    if (!draft) {
      return fail(request, "not_found", "Уведомление не найдено", 404);
    }
    return ok(request, { draft });
  } catch (error) {
    return serverError(request, "Ошибка обновления уведомления", error);
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: `/api/office/notifications/drafts/${params.id}`,
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
      path: `/api/office/notifications/drafts/${params.id}`,
      role,
      userId: session.id ?? null,
      status: 403,
      latencyMs: Date.now() - startedAt,
      error: "FORBIDDEN",
    });
    return forbidden(request);
  }

  try {
    const deleted = deleteNotificationDraft(params.id);
    if (!deleted) {
      return fail(request, "not_found", "Уведомление не найдено", 404);
    }
    return ok(request, { deleted: true });
  } catch (error) {
    return serverError(request, "Ошибка удаления уведомления", error);
  }
}
