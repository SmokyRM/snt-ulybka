import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import {
  listPeriods,
  createPeriod,
  updatePeriod,
  getPeriod,
} from "@/lib/billing/core";
import { logAdminAction } from "@/lib/audit";
import { ok, unauthorized, badRequest, fail, serverError } from "@/lib/api/respond";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!hasFinanceAccess(user)) {
      return unauthorized(request);
    }

    const periods = listPeriods();
    return ok(request, { periods });
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

    const year = typeof body.year === "number" ? body.year : NaN;
    const month = typeof body.month === "number" ? body.month : NaN;

    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      return badRequest(request, "Invalid year or month");
    }

    const period = createPeriod({ year, month });

    await logAdminAction({
      action: "period_created",
      entity: "period",
      entityId: period.id,
      after: period,
      meta: { actorUserId: user?.id ?? null, actorRole: user?.role ?? null },
    });

    return ok(request, { period }, { status: 201 });
  } catch (error) {
    return badRequest(request, error instanceof Error ? error.message : "Failed to create period");
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
    const existing = getPeriod(id);
    if (!existing) {
      return fail(request, "not_found", "Period not found", 404);
    }

    const updates: Partial<{
      year: number;
      month: number;
      status: "open" | "closed";
    }> = {};

    if (typeof body.year === "number") updates.year = body.year;
    if (typeof body.month === "number") updates.month = body.month;
    if (body.status === "open" || body.status === "closed") updates.status = body.status;

    const updated = updatePeriod(id, updates);
    if (!updated) {
      return serverError(request, "Failed to update period");
    }

    await logAdminAction({
      action: "period_updated",
      entity: "period",
      entityId: id,
      before: existing,
      after: updated,
      meta: { actorUserId: user?.id ?? null, actorRole: user?.role ?? null },
    });

    return ok(request, { period: updated });
  } catch (error) {
    return badRequest(request, error instanceof Error ? error.message : "Failed to update period");
  }
}
