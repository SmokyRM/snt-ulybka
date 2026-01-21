import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import {
  listTariffs,
  createTariff,
  updateTariff,
  getTariff,
  deleteTariff,
} from "@/lib/billing/core";
import { logAdminAction } from "@/lib/audit";
import { ok, unauthorized, badRequest, fail, serverError } from "@/lib/api/respond";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!hasFinanceAccess(user)) {
      return unauthorized(request);
    }

    const tariffs = listTariffs();
    return ok(request, { tariffs });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!hasFinanceAccess(user)) {
      return unauthorized(request);
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return badRequest(request, "Bad request");
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const amount = typeof body.amount === "number" ? body.amount : NaN;
    const unit = body.unit === "plot" || body.unit === "area" ? body.unit : "plot";
    const recurrence = body.recurrence === "monthly" || body.recurrence === "quarterly" || body.recurrence === "yearly" || body.recurrence === "one-time" ? body.recurrence : "monthly";
    const active = typeof body.active === "boolean" ? body.active : true;

    if (!name || !code || !Number.isFinite(amount) || amount <= 0) {
      return badRequest(request, "Invalid data");
    }

    const tariff = createTariff({ name, code, amount, unit, recurrence, active });

    await logAdminAction({
      action: "tariff_created",
      entity: "tariff",
      entityId: tariff.id,
      after: tariff,
      meta: { actorUserId: user?.id ?? null, actorRole: user?.role ?? null },
    });

    return ok(request, { tariff }, { status: 201 });
  } catch (error) {
    return badRequest(request, error instanceof Error ? error.message : "Failed to create tariff");
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getSessionUser();
    if (!hasFinanceAccess(user)) {
      return unauthorized(request);
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || typeof body.id !== "string") {
      return badRequest(request, "Bad request");
    }

    const id = body.id.trim();
    const existing = getTariff(id);
    if (!existing) {
      return fail(request, "not_found", "Tariff not found", 404);
    }

    const updates: Partial<{
      name: string;
      code: string;
      amount: number;
      unit: "plot" | "area";
      recurrence: "monthly" | "quarterly" | "yearly" | "one-time";
      active: boolean;
    }> = {};

    if (typeof body.name === "string") updates.name = body.name.trim();
    if (typeof body.code === "string") updates.code = body.code.trim();
    if (typeof body.amount === "number") updates.amount = body.amount;
    if (body.unit === "plot" || body.unit === "area") updates.unit = body.unit;
    if (body.recurrence === "monthly" || body.recurrence === "quarterly" || body.recurrence === "yearly" || body.recurrence === "one-time") {
      updates.recurrence = body.recurrence;
    }
    if (typeof body.active === "boolean") updates.active = body.active;

    const updated = updateTariff(id, updates);
    if (!updated) {
      return serverError(request, "Failed to update tariff");
    }

    await logAdminAction({
      action: "tariff_updated",
      entity: "tariff",
      entityId: id,
      before: existing,
      after: updated,
      meta: { actorUserId: user?.id ?? null, actorRole: user?.role ?? null },
    });

    return ok(request, { tariff: updated });
  } catch (error) {
    return badRequest(request, error instanceof Error ? error.message : "Failed to update tariff");
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getSessionUser();
    if (!hasFinanceAccess(user)) {
      return unauthorized(request);
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return badRequest(request, "Tariff ID is required");
    }

    const existing = getTariff(id);
    if (!existing) {
      return fail(request, "not_found", "Tariff not found", 404);
    }

    const deleted = deleteTariff(id);
    if (!deleted) {
      return serverError(request, "Failed to delete tariff");
    }

    await logAdminAction({
      action: "tariff_deleted",
      entity: "tariff",
      entityId: id,
      before: existing,
      after: null,
      meta: { actorUserId: user?.id ?? null, actorRole: user?.role ?? null },
    });

    return ok(request, { ok: true });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
