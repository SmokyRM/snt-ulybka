import { getSessionUser } from "@/lib/session.server";
import { checkAdminOrOfficeAccess } from "@/lib/rbac/accessCheck";
import { addMeterReading, getLastMeterReading, listMeterReadings } from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";
import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api/respond";

export async function GET(request: Request) {
  const accessCheck = await checkAdminOrOfficeAccess(request);
  if (!accessCheck.allowed) {
    return accessCheck.reason === "unauthorized" ? unauthorized(request) : forbidden(request);
  }
  
  await getSessionUser();

  const url = new URL(request.url);
  const meterId = url.searchParams.get("meterId");
  if (!meterId) return badRequest(request, "meterId required");

  const readings = listMeterReadings(meterId);
  return ok(request, { readings });
}

export async function POST(request: Request) {
  const accessCheck = await checkAdminOrOfficeAccess(request);
  if (!accessCheck.allowed) {
    return accessCheck.reason === "unauthorized" ? unauthorized(request) : forbidden(request);
  }
  
  const user = await getSessionUser();
  if (!user) {
    return unauthorized(request);
  }

  const body = await request.json().catch(() => ({}));
  const meterId = (body.meterId as string | undefined)?.trim();
  const readingDate = (body.readingDate as string | undefined)?.trim();
  const value = Number(body.value);
  const source = (body.source as string | undefined) ?? "manual_admin";

  if (!meterId || !readingDate || !Number.isFinite(value)) {
    return badRequest(request, "meterId, readingDate, value required");
  }
  try {
    const last = getLastMeterReading(meterId);
    if (last && value < last.value) {
      return badRequest(request, "Показание меньше предыдущего");
    }
    const reading = addMeterReading({
      meterId,
      readingDate,
      value,
      source: source === "import" || source === "owner" ? source : "manual_admin",
      createdByUserId: user.id,
    });
    const delta = last ? value - last.value : value;
    await logAdminAction({
      action: "add_meter_reading",
      entity: "meter_reading",
      entityId: reading.id,
      after: { reading, previousValue: last?.value ?? null, delta, createdBy: user.id, createdByRole: user.role },
      headers: request.headers,
    });
    return ok(
      request,
      { reading, previousValue: last?.value ?? null, currentValue: value, deltaKwh: delta },
      { status: 201 }
    );
  } catch (e) {
    return badRequest(request, (e as Error).message);
  }
}
