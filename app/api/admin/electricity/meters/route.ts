import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session.server";
import { createMeter, getLastMeterReading, listAllMeters, listMetersByPlot } from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const plotId = url.searchParams.get("plotId");
  const activeParam = url.searchParams.get("active");
  if (!plotId && !activeParam) {
    return NextResponse.json({ error: "plotId or active param required" }, { status: 400 });
  }
  let meters = plotId ? listMetersByPlot(plotId) : listAllMeters();
  if (activeParam) {
    meters = meters.filter((m) => m.active);
  }
  const withLast = meters.map((m) => ({
    ...m,
    lastReading: getLastMeterReading(m.id),
  }));
  return NextResponse.json({ meters: withLast });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const plotId = (body.plotId as string | undefined)?.trim();
  if (!plotId) {
    return NextResponse.json({ error: "plotId required" }, { status: 400 });
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
  return NextResponse.json({ meter }, { status: 201 });
}
