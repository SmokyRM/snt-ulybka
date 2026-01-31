import { ok, badRequest, forbidden, unauthorized, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { hasPermission } from "@/lib/permissions";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { createCampaign, listCampaigns, type CampaignAudience, type CampaignChannel, type CampaignFilters } from "@/lib/office/communications.store";
import { previewCampaign } from "@/lib/office/campaigns.server";
import { logAdminAction } from "@/lib/audit";

export async function GET(request: Request) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/notifications/campaigns",
      role: null,
      userId: null,
      status: 401,
      latencyMs: Date.now() - startedAt,
      error: "UNAUTHORIZED",
    });
    return unauthorized(request);
  }

  if (!isStaffOrAdmin(role)) {
    return forbidden(request);
  }

  if (
    !hasPermission(role, "notifications.manage") &&
    !hasPermission(role, "notifications.send") &&
    !hasPermission(role, "notifications.generate_campaign")
  ) {
    return forbidden(request);
  }

  return ok(request, { items: listCampaigns() });
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/notifications/campaigns",
      role: null,
      userId: null,
      status: 401,
      latencyMs: Date.now() - startedAt,
      error: "UNAUTHORIZED",
    });
    return unauthorized(request);
  }

  if (!isStaffOrAdmin(role)) {
    return forbidden(request);
  }

  if (
    !(role === "admin" || role === "chairman") &&
    !hasPermission(role, "notifications.send") &&
    !hasPermission(role, "notifications.generate_campaign")
  ) {
    return forbidden(request);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const mode = body?.mode as string | undefined;
    const name = String(body?.name ?? "").trim();
    const templateKey = String(body?.templateKey ?? "").trim();
    const channel = body?.channel as CampaignChannel | undefined;
    const audience = body?.audience as CampaignAudience | undefined;
    const filters = (body?.filters ?? {}) as CampaignFilters;

    if (!templateKey || !channel || !audience) {
      return badRequest(request, "Не заполнены параметры кампании");
    }

    if (mode === "preview") {
      const draft = createCampaign({
        name: name || "preview",
        templateKey,
        channel,
        audience,
        filters,
        createdBy: session.id ?? null,
      });
      const preview = previewCampaign(draft);
      return ok(request, preview);
    }

    if (!name) {
      return badRequest(request, "Название кампании обязательно");
    }

    const campaign = createCampaign({
      name,
      templateKey,
      channel,
      audience,
      filters,
      createdBy: session.id ?? null,
    });

    await logAdminAction({
      action: "campaign.create",
      entity: "campaign",
      entityId: campaign.id,
      route: "/api/office/notifications/campaigns",
      success: true,
      meta: { name },
      headers: request.headers,
    });

    return ok(request, { campaign });
  } catch (error) {
    return serverError(request, "Ошибка создания кампании", error);
  }
}
