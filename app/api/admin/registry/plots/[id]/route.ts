import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { findPlotById, listPersons, updatePlotStatus, linkOwnerToPlot } from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";
import { Plot } from "@/types/snt";
import { fail, forbidden, ok, unauthorized, serverError } from "@/lib/api/respond";

type ParamsPromise<T> = { params: Promise<T> };

export async function GET(request: Request, { params }: ParamsPromise<{ id: string }>) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) return unauthorized(request, "unauthorized");
    if (!hasAdminAccess(user)) return forbidden(request, "forbidden");

    const plot = findPlotById(id);
    if (!plot) return fail(request, "not_found", "not found", 404);
    const persons = listPersons();
    const ownerLink = persons.find((p) => p.fullName === plot.ownerFullName);
    return ok(request, { plot, owner: ownerLink ?? null });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}

export async function PATCH(request: Request, { params }: ParamsPromise<{ id: string }>) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) return unauthorized(request, "unauthorized");
    if (!hasAdminAccess(user)) return forbidden(request, "forbidden");

    const plot = findPlotById(id);
    if (!plot) return fail(request, "not_found", "not found", 404);

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

    return ok(request, { plot: updated });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
