import { getSessionUser } from "@/lib/session.server";
import { checkAdminOrOfficeAccess } from "@/lib/rbac/accessCheck";
import {
  listUnifiedBillingPeriods,
  createUnifiedBillingPeriod,
  updateUnifiedBillingPeriod,
  findUnifiedBillingPeriodById,
} from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";
import { ok, unauthorized, forbidden, badRequest, fail, serverError } from "@/lib/api/respond";

export async function GET(request: Request) {
  try {
    const accessCheck = await checkAdminOrOfficeAccess(request);
    if (!accessCheck.allowed) {
      return accessCheck.reason === "unauthorized" ? unauthorized(request) : forbidden(request);
    }

    const user = await getSessionUser();

    const periods = listUnifiedBillingPeriods();
    return ok(request, { periods });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}

export async function POST(request: Request) {
  try {
    const accessCheck = await checkAdminOrOfficeAccess(request);
    if (!accessCheck.allowed) {
      return accessCheck.reason === "unauthorized" ? unauthorized(request) : forbidden(request);
    }

    const user = await getSessionUser();
    if (!user) {
      return unauthorized(request);
    }

    const body = await request.json().catch(() => ({}));
    const { from, to, title } = body;

    if (!from || !to) {
      return badRequest(request, "from and to are required");
    }

    // Validate dates
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return badRequest(request, "invalid dates");
    }
    if (fromDate > toDate) {
      return badRequest(request, "from must be <= to");
    }

    const period = createUnifiedBillingPeriod({
      from,
      to,
      status: "draft",
      title: title || null,
      createdByUserId: user.id ?? null,
    });

    await logAdminAction({
      action: "create_billing_period",
      entity: "billing_period",
      entityId: period.id,
      after: { from, to, status: period.status, title: period.title },
      headers: request.headers,
    });

    return ok(request, { period });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}

export async function PUT(request: Request) {
  try {
    const accessCheck = await checkAdminOrOfficeAccess(request);
    if (!accessCheck.allowed) {
      return accessCheck.reason === "unauthorized" ? unauthorized(request) : forbidden(request);
    }

    const user = await getSessionUser();
    if (!user) {
      return unauthorized(request);
    }

    const body = await request.json().catch(() => ({}));
    const { id, from, to, status, title } = body;

    if (!id) {
      return badRequest(request, "id is required");
    }

    const existing = findUnifiedBillingPeriodById(id);
    if (!existing) {
      return fail(request, "not_found", "period not found", 404);
    }

    const before = { ...existing };
    const updated = updateUnifiedBillingPeriod(id, {
      from,
      to,
      status,
      title: title !== undefined ? title : existing.title,
      updatedByUserId: user.id ?? null,
    });

    if (!updated) {
      return serverError(request, "failed to update");
    }

    await logAdminAction({
      action: "update_billing_period",
      entity: "billing_period",
      entityId: id,
      before,
      after: updated,
      headers: request.headers,
    });

    return ok(request, { period: updated });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
