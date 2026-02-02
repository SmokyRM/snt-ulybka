export const runtime = "nodejs";

import { ok, forbidden, unauthorized, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { hasPermission } from "@/lib/permissions";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { duplicateCampaign } from "@/lib/office/communications.store";
import { hasPgConnection, getDraft, createDraft } from "@/lib/office/notifications.pg";
import { logAdminAction } from "@/lib/audit";

export async function POST(request: Request, context: { params: { id: string } }) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/notifications/campaigns/[id]/duplicate",
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

  if (!(role === "admin" || role === "chairman") && !hasPermission(role, "notifications.send")) {
    return forbidden(request);
  }

  try {
    const usePg = hasPgConnection();
    if (usePg) {
      const existing = await getDraft(context.params.id);
      if (!existing) {
        return ok(request, { campaign: null });
      }
      const campaign = await createDraft({
        type: existing.type,
        payload: { ...existing.payload, name: `${existing.payload.name} (копия)` },
        createdBy: session.id ?? null,
      });
      await logAdminAction({
        action: "campaign.duplicate",
        entity: "campaign",
        entityId: campaign.id,
        route: "/api/office/notifications/campaigns/[id]/duplicate",
        success: true,
        headers: request.headers,
      });
      return ok(request, {
        campaign: {
          id: campaign.id,
          name: campaign.payload.name,
          templateKey: campaign.payload.templateKey,
          channel: campaign.payload.channel,
          audience: campaign.payload.audience,
          status: campaign.status,
          scheduleAt: campaign.sendAt,
          createdAt: campaign.createdAt,
          stats: { targetedCount: 0, sentCount: 0, failedCount: 0, skippedCount: 0 },
          lastError: null,
        },
      });
    }

    const campaign = duplicateCampaign(context.params.id, session.id ?? null);
    if (campaign) {
      await logAdminAction({
        action: "campaign.duplicate",
        entity: "campaign",
        entityId: campaign.id,
        route: "/api/office/notifications/campaigns/[id]/duplicate",
        success: true,
        headers: request.headers,
      });
    }
    return ok(request, { campaign });
  } catch (error) {
    return serverError(request, "Ошибка дублирования", error);
  }
}
