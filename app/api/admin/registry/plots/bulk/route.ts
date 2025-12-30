import { NextResponse } from "next/server";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { updatePlotsBulk } from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";
import { Plot } from "@/types/snt";

type BulkBody = {
  plotIds?: string[];
  action?: string;
  payload?: Record<string, unknown>;
  comment?: string;
};

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasAdminAccess(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as BulkBody;
  const ids = Array.isArray(body.plotIds) ? body.plotIds.filter((id) => typeof id === "string") : [];
  const action = (body.action ?? "").toString();
  if (!ids.length || !action) {
    return NextResponse.json({ error: "plotIds and action are required" }, { status: 400 });
  }

  const patch: Partial<Plot> = {};
  if (action === "set_membership") {
    const status = (body.payload?.membershipStatus as string | undefined)?.toUpperCase?.();
    if (status === "MEMBER" || status === "NON_MEMBER" || status === "PENDING") {
      patch.membershipStatus = status as Plot["membershipStatus"];
    } else {
      return NextResponse.json({ error: "invalid membershipStatus" }, { status: 400 });
    }
  } else if (action === "archive") {
    patch.status = "archived";
  } else if (action === "unarchive") {
    patch.status = "active";
  } else if (action === "needs_review") {
    patch.needsReview = true;
  } else {
    return NextResponse.json({ error: "unsupported action" }, { status: 400 });
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

  return NextResponse.json({ updated: result.updated });
}
