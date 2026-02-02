export const runtime = "nodejs";

import { ok, badRequest, forbidden, unauthorized, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { hasPermission } from "@/lib/permissions";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { getCampaign, scheduleCampaign } from "@/lib/office/communications.store";
import { hasPgConnection, scheduleDraft, getDraft } from "@/lib/office/notifications.pg";
import { logAdminAction } from "@/lib/audit";

export async function POST(request: Request, context: { params: { id: string } }) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/notifications/campaigns/[id]/schedule",
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
    const body = await request.json().catch(() => ({}));
    const scheduleAt = String(body?.scheduleAt ?? "");
    if (!scheduleAt) {
      return badRequest(request, "scheduleAt обязателен");
    }

    if (usePg) {
      const draft = await getDraft(context.params.id);
      if (!draft) {
        return badRequest(request, "Кампания не найдена");
      }
      const updated = await scheduleDraft(draft.id, scheduleAt);
      if (updated) {
        await logAdminAction({
          action: "campaign.schedule",
          entity: "campaign",
          entityId: draft.id,
          route: "/api/office/notifications/campaigns/[id]/schedule",
          success: true,
          meta: { scheduleAt },
          headers: request.headers,
        });
      }
      return ok(request, {
        campaign: updated
          ? {
              id: updated.id,
              name: updated.payload.name,
              templateKey: updated.payload.templateKey,
              channel: updated.payload.channel,
              audience: updated.payload.audience,
              status: updated.status,
              scheduleAt: updated.sendAt,
              createdAt: updated.createdAt,
              stats: { targetedCount: 0, sentCount: 0, failedCount: 0, skippedCount: 0 },
              lastError: null,
            }
          : null,
      });
    }

    const campaign = getCampaign(context.params.id);
    if (!campaign) {
      return badRequest(request, "Кампания не найдена");
    }
    const updated = scheduleCampaign(campaign.id, scheduleAt);
    if (updated) {
      await logAdminAction({
        action: "campaign.schedule",
        entity: "campaign",
        entityId: campaign.id,
        route: "/api/office/notifications/campaigns/[id]/schedule",
        success: true,
        meta: { scheduleAt },
        headers: request.headers,
      });
    }
    return ok(request, { campaign: updated });
  } catch (error) {
    return serverError(request, "Ошибка планирования", error);
  }
}
