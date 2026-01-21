import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { updatePlotsBulk } from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";
import { Plot } from "@/types/snt";
import { fail, forbidden, ok, unauthorized, serverError } from "@/lib/api/respond";

type BulkBody = {
  plotIds?: string[];
  action?: string;
  payload?: Record<string, unknown>;
  comment?: string;
};

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized(request, "unauthorized");
    if (!hasAdminAccess(user)) return forbidden(request, "forbidden");

    const body = (await request.json().catch(() => ({}))) as BulkBody;
    const ids = Array.isArray(body.plotIds) ? body.plotIds.filter((id) => typeof id === "string") : [];
    const action = (body.action ?? "").toString();
    if (!ids.length || !action) {
      return fail(request, "validation_error", "plotIds and action are required", 400);
    }

    const patch: Partial<Plot> = {};
    if (action === "set_membership") {
      const status = (body.payload?.membershipStatus as string | undefined)?.toUpperCase?.();
      if (status === "MEMBER" || status === "NON_MEMBER" || status === "PENDING") {
        patch.membershipStatus = status as Plot["membershipStatus"];
      } else {
        return fail(request, "validation_error", "invalid membershipStatus", 400);
      }
    } else if (action === "archive") {
      patch.status = "archived";
    } else if (action === "unarchive") {
      patch.status = "active";
    } else if (action === "needs_review") {
      patch.needsReview = true;
    } else {
      return fail(request, "validation_error", "unsupported action", 400);
    }

    const result = updatePlotsBulk(ids, patch);
    await logAdminAction({
      action: `bulk_${action}`,
      entity: "plot",
      entityId: ids.join(","),
      before: { ids },
      after: { updated: result.updated, patch },
      headers: request.headers,
      comment: body.comment ?? null,
    });

    return ok(request, { updated: result.updated });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
