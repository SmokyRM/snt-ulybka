import { NextResponse } from "next/server";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { addMeterReading, getLastMeterReading, listMeterReadings } from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasAdminAccess(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const meterId = url.searchParams.get("meterId");
  if (!meterId) return NextResponse.json({ error: "meterId required" }, { status: 400 });

  const readings = listMeterReadings(meterId);
  return NextResponse.json({ readings });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasAdminAccess(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const meterId = (body.meterId as string | undefined)?.trim();
  const readingDate = (body.readingDate as string | undefined)?.trim();
  const value = Number(body.value);
  const source = (body.source as string | undefined) ?? "manual_admin";

  if (!meterId || !readingDate || !Number.isFinite(value)) {
    return NextResponse.json({ error: "meterId, readingDate, value required" }, { status: 400 });
  }
  try {
    const last = getLastMeterReading(meterId);
    if (last && value < last.value) {
      return NextResponse.json({ error: "Показание меньше предыдущего" }, { status: 400 });
    }
    const reading = addMeterReading({
      meterId,
      readingDate,
      value,
      source: source === "import" || source === "owner" ? source : "manual_admin",
    });
    const delta = last ? value - last.value : value;
    await logAdminAction({
      action: "add_meter_reading",
      entity: "meter_reading",
      entityId: reading.id,
      after: { reading, previousValue: last?.value ?? null, delta },
    });
    return NextResponse.json(
      { reading, previousValue: last?.value ?? null, currentValue: value, deltaKwh: delta },
      { status: 201 }
    );
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
