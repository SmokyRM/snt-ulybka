import { ok, forbidden, unauthorized, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { hasPermission } from "@/lib/permissions";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { listCampaigns, updateCampaign } from "@/lib/office/communications.store";
import { createOfficeJob } from "@/lib/office/jobs.store";
import { enqueueOfficeJob } from "@/lib/office/jobs.server";
import { getRequestId } from "@/lib/api/requestId";
import { logAdminAction } from "@/lib/audit";

export async function POST(request: Request) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/notifications/scheduler/run",
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
    const now = Date.now();
    const due = listCampaigns().filter(
      (c) => c.status === "scheduled" && c.scheduleAt && Date.parse(c.scheduleAt) <= now,
    );
    const requestId = getRequestId(request);

    const jobs = due.map((campaign) => {
      updateCampaign(campaign.id, { status: "sending" });
      const job = createOfficeJob({
        type: "notifications.campaignSend",
        payload: { campaignId: campaign.id },
        createdBy: session.id ?? null,
        requestId,
      });
      enqueueOfficeJob(job.id);
      return job.id;
    });

    if (jobs.length > 0) {
      await logAdminAction({
        action: "campaign.send.start",
        entity: "campaign",
        entityId: null,
        route: "/api/office/notifications/scheduler/run",
        success: true,
        meta: { jobs },
        headers: request.headers,
      });
    }

    return ok(request, { started: jobs.length, jobs });
  } catch (error) {
    return serverError(request, "Ошибка запуска рассылки", error);
  }
}
