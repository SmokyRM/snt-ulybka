import { ok, forbidden, unauthorized, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { hasPermission } from "@/lib/permissions";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { cancelCampaign } from "@/lib/office/communications.store";
import { logAdminAction } from "@/lib/audit";

export async function POST(request: Request, context: { params: { id: string } }) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/notifications/campaigns/[id]/cancel",
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
    const updated = cancelCampaign(context.params.id);
    if (updated) {
      await logAdminAction({
        action: "campaign.cancel",
        entity: "campaign",
        entityId: context.params.id,
        route: "/api/office/notifications/campaigns/[id]/cancel",
        success: true,
        headers: request.headers,
      });
    }
    return ok(request, { campaign: updated });
  } catch (error) {
    return serverError(request, "Ошибка отмены кампании", error);
  }
}
