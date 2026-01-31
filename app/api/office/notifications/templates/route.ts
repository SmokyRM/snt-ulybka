import { ok, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { listNotificationTemplates, getNotificationTemplate, renderTemplate, type NotificationTemplateId } from "@/lib/notificationTemplates";

export async function GET(request: Request) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/notifications/templates",
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
      path: "/api/office/notifications/templates",
      role,
      userId: session.id ?? null,
      status: 403,
      latencyMs: Date.now() - startedAt,
      error: "FORBIDDEN",
    });
    return forbidden(request);
  }

  try {
    const templates = listNotificationTemplates();
    return ok(request, { templates });
  } catch (error) {
    return serverError(request, "Ошибка получения шаблонов", error);
  }
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/notifications/templates",
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
      path: "/api/office/notifications/templates",
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
    const templateId = typeof body.templateId === "string" ? body.templateId as NotificationTemplateId : null;
    const values = typeof body.values === "object" && body.values !== null ? body.values : {};

    if (!templateId) {
      return ok(request, { error: "templateId is required" });
    }

    const rendered = renderTemplate(templateId, values as Record<string, string | number>);
    if (!rendered) {
      return ok(request, { error: "Template not found" });
    }

    return ok(request, { rendered });
  } catch (error) {
    return serverError(request, "Ошибка рендеринга шаблона", error);
  }
}
