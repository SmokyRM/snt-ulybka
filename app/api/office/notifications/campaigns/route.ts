export const runtime = "nodejs";

import { ok, badRequest, forbidden, unauthorized, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { hasPermission } from "@/lib/permissions";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { createCampaign, listCampaigns, type CampaignAudience, type CampaignChannel, type CampaignFilters } from "@/lib/office/communications.store";
import { previewCampaign } from "@/lib/office/campaigns.server";
import {
  hasPgConnection,
  listDrafts,
  createDraft,
  previewDraft,
  type NotificationDraftPayload,
  type NotificationDraft,
} from "@/lib/office/notifications.pg";
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

  if (hasPgConnection()) {
    const drafts = await listDrafts({ type: "campaign" });
    const items = drafts.map((draft: NotificationDraft) => ({
      id: draft.id,
      name: draft.payload.name,
      templateKey: draft.payload.templateKey,
      channel: draft.payload.channel,
      audience: draft.payload.audience,
      status: draft.status,
      scheduleAt: draft.sendAt,
      createdAt: draft.createdAt,
      stats: { targetedCount: 0, sentCount: 0, failedCount: 0, skippedCount: 0 },
      lastError: null,
    }));
    return ok(request, { items });
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
    const usePg = hasPgConnection();
    const body = await request.json().catch(() => ({}));
    const mode = body?.mode as string | undefined;
    const name = String(body?.name ?? "").trim();
    const templateKey = String(body?.templateKey ?? "").trim();
    const channel = body?.channel as CampaignChannel | undefined;
    const audience = body?.audience as CampaignAudience | undefined;
    const rawFilters = (body?.filters ?? {}) as CampaignFilters;
    const payloadFilters: NotificationDraftPayload["filters"] = {
      minDebt: typeof rawFilters.minDebt === "number" ? rawFilters.minDebt : undefined,
      daysOverdue: typeof rawFilters.daysOverdue === "number" ? rawFilters.daysOverdue : undefined,
      segment: typeof rawFilters.segment === "string" ? rawFilters.segment : undefined,
      period: typeof rawFilters.period === "string" ? rawFilters.period : undefined,
    };
    const campaignFilters: CampaignFilters = {
      minDebt: payloadFilters.minDebt ?? null,
      daysOverdue: payloadFilters.daysOverdue ?? null,
      segment: payloadFilters.segment ?? null,
      period: payloadFilters.period ?? null,
    };

    if (!templateKey || !channel || !audience) {
      return badRequest(request, "Не заполнены параметры кампании");
    }

    if (mode === "preview") {
      if (usePg) {
        const payload: NotificationDraftPayload = {
          name: name || "preview",
          templateKey,
          channel,
          audience,
          filters: payloadFilters,
        };
        const preview = await previewDraft(payload);
        return ok(request, preview);
      }

      const draft = createCampaign({
        name: name || "preview",
        templateKey,
        channel,
        audience,
        filters: campaignFilters,
        createdBy: session.id ?? null,
      });
      const preview = previewCampaign(draft);
      return ok(request, preview);
    }

    if (!name) {
      return badRequest(request, "Название кампании обязательно");
    }

    if (usePg) {
      const draft = await createDraft({
        type: "campaign",
        payload: { name, templateKey, channel, audience, filters: payloadFilters },
        createdBy: session.id ?? null,
      });

      await logAdminAction({
        action: "campaign.create",
        entity: "campaign",
        entityId: draft.id,
        route: "/api/office/notifications/campaigns",
        success: true,
        meta: { name },
        headers: request.headers,
      });

      return ok(request, {
        campaign: {
          id: draft.id,
          name: draft.payload.name,
          templateKey: draft.payload.templateKey,
          channel: draft.payload.channel,
          audience: draft.payload.audience,
          status: draft.status,
          scheduleAt: draft.sendAt,
          createdAt: draft.createdAt,
          stats: { targetedCount: 0, sentCount: 0, failedCount: 0, skippedCount: 0 },
          lastError: null,
        },
      });
    }

    const campaign = createCampaign({
      name,
      templateKey,
      channel,
      audience,
      filters: campaignFilters,
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
