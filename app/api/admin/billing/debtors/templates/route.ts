import { NextResponse } from "next/server";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import { ok, unauthorized, forbidden, badRequest, fail, serverError } from "@/lib/api/respond";
import {
  listDebtNotificationTemplates,
  createDebtNotificationTemplate,
  updateDebtNotificationTemplate,
  deleteDebtNotificationTemplate,
  findDebtNotificationTemplateById,
} from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized(request);
  if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
    return forbidden(request);
  }

  const templates = listDebtNotificationTemplates();
  return ok(request, { templates });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized(request);
  if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
    return forbidden(request);
  }

  const body = await request.json().catch(() => ({}));
  const { title, body: bodyText, isDefault } = body;

  if (!title || !bodyText) {
    return badRequest(request, "title and body are required");
  }

  const template = createDebtNotificationTemplate({
    title,
    body: bodyText,
    isDefault: isDefault ?? false,
    createdByUserId: user.id ?? null,
  });

  await logAdminAction({
    action: "create_debt_notification_template",
    entity: "debt_notification_template",
    entityId: template.id,
    after: {
      title: template.title,
      isDefault: template.isDefault,
    },
    meta: { actorUserId: user?.id ?? null, actorRole: user?.role ?? null },
    headers: request.headers,
  });

  return ok(request, { template });
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized(request);
  if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
    return forbidden(request);
  }

  const body = await request.json().catch(() => ({}));
  const { id, title, body: bodyText, isDefault } = body;

  if (!id) {
    return badRequest(request, "id is required");
  }

  const existing = findDebtNotificationTemplateById(id);
  if (!existing) {
    return fail(request, "not_found", "template not found", 404);
  }

  const before = { ...existing };
  const updated = updateDebtNotificationTemplate(id, {
    title: title !== undefined ? title : existing.title,
    body: bodyText !== undefined ? bodyText : existing.body,
    isDefault: isDefault !== undefined ? isDefault : existing.isDefault,
    updatedByUserId: user.id ?? null,
  });

  if (!updated) {
    return serverError(request, "failed to update");
  }

  await logAdminAction({
    action: "update_debt_notification_template",
    entity: "debt_notification_template",
    entityId: id,
    before,
    after: updated,
    meta: { actorUserId: user?.id ?? null, actorRole: user?.role ?? null },
    headers: request.headers,
  });

  return ok(request, { template: updated });
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized(request);
  if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
    return forbidden(request);
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return badRequest(request, "id is required");
  }

  const existing = findDebtNotificationTemplateById(id);
  if (!existing) {
    return fail(request, "not_found", "template not found", 404);
  }

  const deleted = deleteDebtNotificationTemplate(id);
  if (!deleted) {
    return serverError(request, "failed to delete");
  }

  await logAdminAction({
    action: "delete_debt_notification_template",
    entity: "debt_notification_template",
    entityId: id,
    before: existing,
    meta: { actorUserId: user?.id ?? null, actorRole: user?.role ?? null },
    headers: request.headers,
  });

  return ok(request, { success: true });
}
