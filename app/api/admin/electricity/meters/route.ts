import { getSessionUser } from "@/lib/session.server";
import { checkAdminOrOfficeAccess } from "@/lib/rbac/accessCheck";
import { createMeter, getLastMeterReading, listAllMeters, listMetersByPlot, findPlotById } from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";
import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api/respond";

export async function GET(request: Request) {
  const accessCheck = await checkAdminOrOfficeAccess(request);
  if (!accessCheck.allowed) {
    return accessCheck.reason === "unauthorized" ? unauthorized(request) : forbidden(request);
  }
  
  await getSessionUser();

  try {
    const url = new URL(request.url);
    const plotId = url.searchParams.get("plotId");
    const activeParam = url.searchParams.get("active");
    if (!plotId && !activeParam) {
      return badRequest(request, "plotId or active param required");
    }
    let meters = plotId ? listMetersByPlot(plotId) : listAllMeters();
    if (activeParam) {
      meters = meters.filter((m) => m.active);
    }
    const withLast = meters.map((m) => {
      const plot = findPlotById(m.plotId);
      return {
        ...m,
        lastReading: getLastMeterReading(m.id),
        plot: plot ? {
          street: plot.street,
          plotNumber: plot.plotNumber,
          ownerFullName: plot.ownerFullName,
        } : null,
      };
    });
    return ok(request, { meters: withLast });
  } catch (e) {
    return serverError(request, "Internal error", e);
  }
}

export async function POST(request: Request) {
  const accessCheck = await checkAdminOrOfficeAccess(request);
  if (!accessCheck.allowed) {
    return accessCheck.reason === "unauthorized" ? unauthorized(request) : forbidden(request);
  }
  
  await getSessionUser();

  try {
    const body = await request.json().catch(() => ({}));
    const plotId = (body.plotId as string | undefined)?.trim();
    if (!plotId) {
      return badRequest(request, "plotId required");
    }
    const meterNumber = (body.meterNumber as string | undefined)?.trim() || null;
    const installedAt = (body.installedAt as string | undefined)?.trim() || null;

    const meter = createMeter({ plotId, meterNumber, installedAt });
    await logAdminAction({
      action: "create_meter",
      entity: "electricity_meter",
      entityId: meter.id,
      after: meter,
    });
    return ok(request, { meter }, { status: 201 });
  } catch (e) {
    return serverError(request, "Internal error", e);
  }
}
