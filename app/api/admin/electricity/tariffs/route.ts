import { getSessionUser } from "@/lib/session.server";
import { addElectricityTariff, listElectricityTariffs } from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";
import { checkAdminOrOfficeAccess } from "@/lib/rbac/accessCheck";
import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api/respond";

export async function GET(request: Request) {
  const accessCheck = await checkAdminOrOfficeAccess(request);
  if (!accessCheck.allowed) {
    return accessCheck.reason === "unauthorized" ? unauthorized(request) : forbidden(request);
  }
  
  await getSessionUser();
  try {
    return ok(request, { tariffs: listElectricityTariffs() });
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
    const price = Number(body.pricePerKwh);
    const validFrom = (body.validFrom as string | undefined)?.trim();
    if (!Number.isFinite(price) || price <= 0 || !validFrom || Number.isNaN(new Date(validFrom).getTime())) {
      return badRequest(request, "Некорректные данные тарифа");
    }

    const tariff = addElectricityTariff({ pricePerKwh: price, validFrom: new Date(validFrom).toISOString() });
    await logAdminAction({
      action: "set_electricity_tariff",
      entity: "electricity_tariff",
      entityId: tariff.id,
      after: tariff,
    });
    return ok(request, { tariff }, { status: 201 });
  } catch (e) {
    return serverError(request, "Internal error", e);
  }
}
