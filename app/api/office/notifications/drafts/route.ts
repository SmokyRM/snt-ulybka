import { ok, fail, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import {
  listNotificationDrafts,
  createNotificationDraft,
  getNotificationDraftsSummary,
  type NotificationDraftInput,
  type NotificationDraftStatus,
  type NotificationChannel,
} from "@/lib/notificationDrafts.store";

export async function GET(request: Request) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/notifications/drafts",
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
      path: "/api/office/notifications/drafts",
      role,
      userId: session.id ?? null,
      status: 403,
      latencyMs: Date.now() - startedAt,
      error: "FORBIDDEN",
    });
    return forbidden(request);
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as NotificationDraftStatus | null;
    const channel = searchParams.get("channel") as NotificationChannel | null;
    const q = searchParams.get("q");

    const drafts = listNotificationDrafts({ status, channel, q });
    const summary = getNotificationDraftsSummary();

    return ok(request, { drafts, summary });
  } catch (error) {
    return serverError(request, "Ошибка получения уведомлений", error);
  }
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/notifications/drafts",
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
      path: "/api/office/notifications/drafts",
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

    const plotId = typeof body.plotId === "string" ? body.plotId : null;
    const plotLabel = typeof body.plotLabel === "string" ? body.plotLabel : null;
    const residentName = typeof body.residentName === "string" ? body.residentName : null;
    const debtAmount = typeof body.debtAmount === "number" ? body.debtAmount : null;
    const channel = typeof body.channel === "string" ? body.channel : null;
    const subject = typeof body.subject === "string" ? body.subject : null;
    const bodyText = typeof body.body === "string" ? body.body : null;
    const templateId = typeof body.templateId === "string" ? body.templateId : null;

    if (!plotId || !plotLabel || !residentName || debtAmount === null || !channel || !subject || !bodyText) {
      return fail(request, "validation_error", "Все поля обязательны", 400);
    }

    if (channel !== "telegram" && channel !== "email" && channel !== "sms" && channel !== "print") {
      return fail(request, "validation_error", "Неверный канал уведомления", 400);
    }

    const input: NotificationDraftInput = {
      plotId,
      plotLabel,
      residentName,
      debtAmount,
      channel: channel as NotificationChannel,
      subject,
      body: bodyText,
      templateId,
      createdBy: session.id ?? null,
    };

    const draft = createNotificationDraft(input);
    return ok(request, { draft });
  } catch (error) {
    return serverError(request, "Ошибка создания уведомления", error);
  }
}
