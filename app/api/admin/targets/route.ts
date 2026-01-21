import { ok, fail, unauthorized, forbidden } from "@/lib/api/respond";
import { getSessionUser } from "@/lib/session.server";
import { addTargetFund, updateTargetFund } from "@/lib/mockDb";
import { listTargetFundsWithStats } from "@/lib/targets";
import { logAdminAction } from "@/lib/audit";
import { checkAdminOrOfficeAccess } from "@/lib/rbac/accessCheck";

export async function GET(request: Request) {
  const accessCheck = await checkAdminOrOfficeAccess(request);
  if (!accessCheck.allowed) {
    if (accessCheck.reason === "unauthorized") {
      return unauthorized(request);
    }
    return forbidden(request);
  }

  const user = await getSessionUser();

  return ok(request, { items: listTargetFundsWithStats(false) });
}

export async function POST(request: Request) {
  const accessCheck = await checkAdminOrOfficeAccess(request);
  if (!accessCheck.allowed) {
    if (accessCheck.reason === "unauthorized") {
      return unauthorized(request);
    }
    return forbidden(request);
  }

  const user = await getSessionUser();
  if (!user) {
    return unauthorized(request);
  }

  const body = await request.json().catch(() => ({}));
  const title = (body.title as string | undefined)?.trim();
  const description = (body.description as string | undefined)?.trim() || "";
  const targetAmount = Number(body.targetAmount);
  const deadline = (body.deadline as string | undefined)?.trim() || null;
  const status = (body.status as "active" | "completed" | "archived" | undefined) || "active";

  if (!title) return fail(request, "validation_error", "Название обязательно", 400);
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    return fail(request, "validation_error", "Некорректная сумма цели", 400);
  }

  const fund = addTargetFund({
    title,
    description,
    targetAmount,
    deadline: deadline || null,
    status,
    createdByUserId: user.id ?? null,
  });

  await logAdminAction({
    action: "create_target_fund",
    entity: "target_fund",
    entityId: fund.id,
    after: { fund },
    headers: request.headers,
  });

  return ok(request, { fund }, { status: 201 });
}

export async function PUT(request: Request) {
  const accessCheck = await checkAdminOrOfficeAccess(request);
  if (!accessCheck.allowed) {
    if (accessCheck.reason === "unauthorized") {
      return unauthorized(request);
    }
    return forbidden(request);
  }

  const user = await getSessionUser();
  if (!user) {
    return unauthorized(request);
  }

  const body = await request.json().catch(() => ({}));
  const id = body.id as string | undefined;
  const title = (body.title as string | undefined)?.trim();
  const description = (body.description as string | undefined)?.trim();
  const targetAmount = Number(body.targetAmount);
  const deadline = (body.deadline as string | undefined)?.trim() || null;
  const status = body.status as "active" | "completed" | "archived" | undefined;

  if (!id) return fail(request, "validation_error", "ID цели обязателен", 400);

  const { findTargetFundById } = await import("@/lib/mockDb");
  const before = findTargetFundById(id);
  if (!before) {
    return fail(request, "not_found", "Цель не найдена", 404);
  }

  const fund = updateTargetFund(id, {
    title,
    description,
    targetAmount: Number.isFinite(targetAmount) && targetAmount > 0 ? targetAmount : undefined,
    deadline,
    status,
    updatedByUserId: user.id ?? null,
  });

  if (!fund) {
    return fail(request, "not_found", "Цель не найдена", 404);
  }

  await logAdminAction({
    action: "update_target_fund",
    entity: "target_fund",
    entityId: fund.id,
    before,
    after: { fund },
    headers: request.headers,
  });

  return ok(request, { fund });
}
