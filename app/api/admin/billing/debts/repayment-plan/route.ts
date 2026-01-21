import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session.server";
import { checkAdminOrOfficeAccess } from "@/lib/rbac/accessCheck";
import {
  findDebtRepaymentPlanByPlotPeriod,
  createDebtRepaymentPlan,
  updateDebtRepaymentPlan,
  findDebtRepaymentPlanById,
} from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";
import { ok, unauthorized, forbidden, badRequest, serverError } from "@/lib/api/respond";

export async function GET(request: Request) {
  try {
    const accessCheck = await checkAdminOrOfficeAccess(request);
    if (!accessCheck.allowed) {
      return accessCheck.reason === "unauthorized" ? unauthorized(request) : forbidden(request);
    }

    const user = await getSessionUser();

    const { searchParams } = new URL(request.url);
    const plotId = searchParams.get("plotId");
    const periodId = searchParams.get("periodId") || null;

    if (!plotId) {
      return badRequest(request, "plotId is required");
    }

    const plan = findDebtRepaymentPlanByPlotPeriod(plotId, periodId);
    return ok(request, { plan });
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
    const { plotId, periodId, status, comment, agreedAmount, agreedDate } = body;

    if (!plotId) {
      return badRequest(request, "plotId is required");
    }

    const existing = findDebtRepaymentPlanByPlotPeriod(plotId, periodId || null);
    let plan;

    if (existing) {
      plan = updateDebtRepaymentPlan(existing.id, {
        status: status || existing.status,
        comment: comment !== undefined ? comment : existing.comment,
        agreedAmount: agreedAmount !== undefined ? agreedAmount : existing.agreedAmount,
        agreedDate: agreedDate !== undefined ? agreedDate : existing.agreedDate,
        updatedByUserId: user.id ?? null,
      });
    } else {
      plan = createDebtRepaymentPlan({
        plotId,
        periodId: periodId || null,
        status: status || "pending",
        comment: comment || null,
        agreedAmount: agreedAmount || null,
        agreedDate: agreedDate || null,
        createdByUserId: user.id ?? null,
      });
    }

    if (!plan) {
      return serverError(request, "failed to create/update plan");
    }

    await logAdminAction({
      action: existing ? "update_debt_repayment_plan" : "create_debt_repayment_plan",
      entity: "debt_repayment_plan",
      entityId: plan.id,
      after: {
        plotId: plan.plotId,
        periodId: plan.periodId,
        status: plan.status,
        comment: plan.comment,
        agreedAmount: plan.agreedAmount,
        agreedDate: plan.agreedDate,
      },
      meta: { actorUserId: user?.id ?? null, actorRole: user?.role ?? null },
      headers: request.headers,
    });

    return ok(request, { plan });
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
    const { id, status, comment, agreedAmount, agreedDate } = body;

    if (!id) {
      return badRequest(request, "id is required");
    }

    const existing = findDebtRepaymentPlanById(id);
    if (!existing) {
      return badRequest(request, "plan not found");
    }

    const plan = updateDebtRepaymentPlan(id, {
      status: status !== undefined ? status : existing.status,
      comment: comment !== undefined ? comment : existing.comment,
      agreedAmount: agreedAmount !== undefined ? agreedAmount : existing.agreedAmount,
      agreedDate: agreedDate !== undefined ? agreedDate : existing.agreedDate,
      updatedByUserId: user.id ?? null,
    });

    if (!plan) {
      return serverError(request, "failed to update plan");
    }

    await logAdminAction({
      action: "update_debt_repayment_plan",
      entity: "debt_repayment_plan",
      entityId: plan.id,
      before: {
        status: existing.status,
        comment: existing.comment,
        agreedAmount: existing.agreedAmount,
        agreedDate: existing.agreedDate,
      },
      after: {
        status: plan.status,
        comment: plan.comment,
        agreedAmount: plan.agreedAmount,
        agreedDate: plan.agreedDate,
      },
      meta: { actorUserId: user?.id ?? null, actorRole: user?.role ?? null },
      headers: request.headers,
    });

    return ok(request, { plan });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
