export const runtime = "nodejs";

import { ok, badRequest, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { hasPermission } from "@/lib/permissions";
import { logAdminAction } from "@/lib/audit";
import {
  listCampaignsDb,
  createCampaignDb,
  type CampaignSegment,
} from "@/lib/notifications/campaigns.pg";
import { getTemplate } from "@/lib/notifications/templates.pg";
import { buildDebtorsSegment } from "@/lib/notifications/segment";
import { renderTemplate } from "@/lib/notifications/templateEngine";

const MAX_RECIPIENTS = 500;

export async function GET(request: Request) {
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";
  if (!session) return unauthorized(request);
  if (!isStaffOrAdmin(role)) return forbidden(request);

  try {
    const campaigns = await listCampaignsDb();
    return ok(request, { campaigns });
  } catch (error) {
    return serverError(request, "Ошибка загрузки кампаний", error);
  }
}

export async function POST(request: Request) {
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";
  if (!session) return unauthorized(request);
  if (!isStaffOrAdmin(role)) return forbidden(request);
  if (!hasPermission(role, "notifications.generate_campaign") && !hasPermission(role, "notifications.manage"))
    return forbidden(request);

  try {
    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const channel = typeof body.channel === "string" ? body.channel : "";
    const templateId = typeof body.templateId === "string" ? body.templateId : null;
    const segment: CampaignSegment = typeof body.segment === "object" && body.segment ? body.segment : {};

    if (!name || !channel) return badRequest(request, "name и channel обязательны");
    if (!templateId) return badRequest(request, "templateId обязателен");

    const template = await getTemplate(templateId);
    if (!template) return badRequest(request, "Шаблон не найден");

    const campaign = await createCampaignDb({
      name,
      channel,
      templateId,
      segment,
      createdBy: session.id ?? null,
    });

    await logAdminAction({
      action: "campaign.create",
      entity: "notification_campaign",
      entityId: campaign.id,
      route: "/api/office/notifications/campaigns/v2",
      success: true,
      meta: { name, channel, templateId },
      headers: request.headers,
    });

    return ok(request, { campaign });
  } catch (error) {
    return serverError(request, "Ошибка создания кампании", error);
  }
}
