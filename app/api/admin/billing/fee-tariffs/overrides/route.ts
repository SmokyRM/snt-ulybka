import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import {
  listFeeTariffOverrides,
  createFeeTariffOverride,
  deleteFeeTariffOverride,
  findFeeTariffById,
} from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";
import { ok, unauthorized, forbidden, badRequest, fail, serverError } from "@/lib/api/respond";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized(request);
    if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
      return forbidden(request);
    }

    const { searchParams } = new URL(request.url);
    const tariffId = searchParams.get("tariffId");
    const plotId = searchParams.get("plotId");

    const overrides = listFeeTariffOverrides({
      tariffId: tariffId || null,
      plotId: plotId || null,
    });

    return ok(request, { overrides });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized(request);
    if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
      return forbidden(request);
    }

    const body = await request.json().catch(() => ({}));
    const { tariffId, plotId, amount, comment } = body;

    if (!tariffId || !plotId || amount === undefined) {
      return badRequest(request, "tariffId, plotId, amount are required");
    }

    const tariff = findFeeTariffById(tariffId);
    if (!tariff) {
      return fail(request, "not_found", "tariff not found", 404);
    }

    if (typeof amount !== "number" || amount <= 0) {
      return badRequest(request, "amount must be a positive number");
    }

    const createData: {
      tariffId: string;
      plotId: string;
      amount: number;
      comment?: string | null;
      createdByUserId: string | null;
    } = { tariffId, plotId, amount, createdByUserId: user.id ?? null };
    if (comment !== undefined) createData.comment = comment;

    const override = createFeeTariffOverride(createData);

    await logAdminAction({
      action: "create_fee_tariff_override",
      entity: "fee_tariff_override",
      entityId: override.id,
      after: { tariffId, plotId, amount },
      headers: request.headers,
    });

    return ok(request, { override });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized(request);
    if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
      return forbidden(request);
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return badRequest(request, "id is required");
    }

    const overrides = listFeeTariffOverrides();
    const existing = overrides.find((o) => o.id === id);
    if (!existing) {
      return fail(request, "not_found", "override not found", 404);
    }

    const deleted = deleteFeeTariffOverride(id);
    if (!deleted) {
      return serverError(request, "failed to delete");
    }

    await logAdminAction({
      action: "delete_fee_tariff_override",
      entity: "fee_tariff_override",
      entityId: id,
      before: existing,
      headers: request.headers,
    });

    return ok(request, { success: true });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
