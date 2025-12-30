import { NextResponse } from "next/server";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { findPlotById, listPersons, updatePlotStatus, linkOwnerToPlot } from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";
import { Plot } from "@/types/snt";

type ParamsPromise<T> = { params: Promise<T> };

export async function GET(_request: Request, { params }: ParamsPromise<{ id: string }>) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasAdminAccess(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const plot = findPlotById(id);
  if (!plot) return NextResponse.json({ error: "not found" }, { status: 404 });
  const persons = listPersons();
  const ownerLink = persons.find((p) => p.fullName === plot.ownerFullName);
  return NextResponse.json({ plot, owner: ownerLink ?? null });
}

export async function PATCH(request: Request, { params }: ParamsPromise<{ id: string }>) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasAdminAccess(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const plot = findPlotById(id);
  if (!plot) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const statusRaw = (body.status as string | undefined)?.trim();
  const membershipRaw = (body.membershipStatus as string | undefined)?.trim();
  const ownerId = (body.ownerId as string | undefined)?.trim();

  let status: Plot["status"] | undefined;
  if (statusRaw === "active" || statusRaw === "archived") {
    status = statusRaw;
  }

  let membershipStatus: Plot["membershipStatus"] | undefined;
  if (membershipRaw) {
    const upper = membershipRaw.toUpperCase();
    if (upper === "MEMBER" || upper === "NON_MEMBER" || upper === "PENDING") {
      membershipStatus = upper as Plot["membershipStatus"];
    }
  }

  const before = { ...plot };
  let updated = plot;

  if (status || membershipStatus) {
    updated = updatePlotStatus(id, {
      status: status ?? plot.status,
      membershipStatus: membershipStatus ?? plot.membershipStatus,
    }) ?? plot;
  }

  if (ownerId) {
    const linked = linkOwnerToPlot(id, ownerId);
    if (linked) updated = linked.plot;
  }

  await logAdminAction({
    action: "update_plot",
    entity: "plot",
    entityId: id,
    before,
    after: updated,
  });

  return NextResponse.json({ plot: updated });
}
