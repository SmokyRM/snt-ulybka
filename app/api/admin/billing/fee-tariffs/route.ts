import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import {
  listFeeTariffs,
  createFeeTariff,
  updateFeeTariff,
  deleteFeeTariff,
  findFeeTariffById,
} from "@/lib/mockDb";
import type { FeeTariffType, FeeTariffMethod } from "@/types/snt";
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
    const type = searchParams.get("type") as FeeTariffType | null;
    const activeAt = searchParams.get("activeAt");

    const tariffs = listFeeTariffs({
      type: type || null,
      activeAt: activeAt || null,
    });

    return ok(request, { tariffs });
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
    let { type, method, activeFrom, title, status } = body;
    const { amount, activeTo } = body;
    const name = body.name;

    // Минимальная форма: name, year, amount
    if (name !== undefined) title = title ?? name;
    if (body.year != null && !activeFrom) activeFrom = `${Number(body.year)}-01-01`;
    if (!type) type = "member";
    if (!method) method = "fixed";
    if (status === undefined || status === null) status = "active";

    if (amount === undefined || activeFrom === undefined) {
      return badRequest(request, "amount and activeFrom (or year) are required");
    }

    if (!["member", "target"].includes(type)) {
      return badRequest(request, "type must be 'member' or 'target'");
    }

    if (!["fixed", "per_sotka", "per_plot"].includes(method)) {
      return badRequest(request, "method must be 'fixed', 'per_sotka', or 'per_plot'");
    }

    if (typeof amount !== "number" || amount <= 0) {
      return badRequest(request, "amount must be a positive number");
    }

    if (status != null && !["active", "draft"].includes(status)) {
      return badRequest(request, "status must be 'active' or 'draft'");
    }

    const tariff = createFeeTariff({
      type: type as FeeTariffType,
      method: method as FeeTariffMethod,
      amount,
      activeFrom: String(activeFrom).slice(0, 10),
      activeTo: activeTo || null,
      title: title || null,
      status: status === "draft" ? "draft" : "active",
      createdByUserId: user.id ?? null,
    });

    await logAdminAction({
      action: "create_fee_tariff",
      entity: "fee_tariff",
      entityId: tariff.id,
      after: { type, method, amount, activeFrom, activeTo, title },
      headers: request.headers,
    });

    return ok(request, { tariff });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized(request);
    if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
      return forbidden(request);
    }

    const body = await request.json().catch(() => ({}));
    let { activeFrom, title } = body;
    const { id, type, method, amount, activeTo, status } = body;
    const name = body.name;

    if (!id) {
      return badRequest(request, "id is required");
    }

    const existing = findFeeTariffById(id);
    if (!existing) {
      return fail(request, "not_found", "tariff not found", 404);
    }

    if (name !== undefined) title = title ?? name;
    if (body.year != null && activeFrom === undefined) activeFrom = `${Number(body.year)}-01-01`;
    if (amount !== undefined && (typeof amount !== "number" || amount <= 0)) {
      return badRequest(request, "amount must be a positive number");
    }
    if (status != null && !["active", "draft"].includes(status)) {
      return badRequest(request, "status must be 'active' or 'draft'");
    }

    const before = { ...existing };
    const patch: Parameters<typeof updateFeeTariff>[1] = { updatedByUserId: user.id ?? null };
    if (type !== undefined) patch.type = type as FeeTariffType;
    if (method !== undefined) patch.method = method as FeeTariffMethod;
    if (amount !== undefined) patch.amount = amount;
    if (activeFrom !== undefined) patch.activeFrom = String(activeFrom).slice(0, 10);
    if (activeTo !== undefined) patch.activeTo = activeTo;
    if (title !== undefined) patch.title = title;
    if (status !== undefined) patch.status = status === "draft" ? "draft" : "active";

    const updated = updateFeeTariff(id, patch);

    if (!updated) {
      return serverError(request, "failed to update");
    }

    await logAdminAction({
      action: "update_fee_tariff",
      entity: "fee_tariff",
      entityId: id,
      before,
      after: updated,
      headers: request.headers,
    });

    return ok(request, { tariff: updated });
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

    const existing = findFeeTariffById(id);
    if (!existing) {
      return fail(request, "not_found", "tariff not found", 404);
    }

    const deleted = deleteFeeTariff(id);
    if (!deleted) {
      return serverError(request, "failed to delete");
    }

    await logAdminAction({
      action: "delete_fee_tariff",
      entity: "fee_tariff",
      entityId: id,
      before: existing,
      headers: request.headers,
    });

    return ok(request, { success: true });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
