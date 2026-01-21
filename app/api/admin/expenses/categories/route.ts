import { getSessionUser } from "@/lib/session.server";
import { checkAdminOrOfficeAccess } from "@/lib/rbac/accessCheck";
import {
  listExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
} from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";
import { badRequest, fail, forbidden, ok, serverError, unauthorized } from "@/lib/api/respond";

export async function GET(request: Request) {
  const accessCheck = await checkAdminOrOfficeAccess(request);
  if (!accessCheck.allowed) {
    return accessCheck.reason === "unauthorized" ? unauthorized(request) : forbidden(request);
  }
  
  const user = await getSessionUser();
  if (!user) {
    return unauthorized(request);
  }

  try {
    const categories = listExpenseCategories();
    return ok(request, { categories });
  } catch (e) {
    return serverError(request, "Internal error", e);
  }
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

  try {
    const body = await request.json().catch(() => ({}));
    const name = (body.name as string | undefined)?.trim();
    const description = (body.description as string | undefined)?.trim() || null;

    if (!name) {
      return badRequest(request, "Название категории обязательно");
    }

    const category = createExpenseCategory({
      name,
      description,
      createdByUserId: user.id ?? null,
    });

    await logAdminAction({
      action: "create_expense_category",
      entity: "expense_category",
      entityId: category.id,
      after: { category },
      headers: request.headers,
    });

    return ok(request, { category }, { status: 201 });
  } catch (e) {
    return serverError(request, "Internal error", e);
  }
}

export async function PUT(request: Request) {
  const accessCheck = await checkAdminOrOfficeAccess(request);
  if (!accessCheck.allowed) {
    return accessCheck.reason === "unauthorized" ? unauthorized(request) : forbidden(request);
  }
  
  const user = await getSessionUser();
  if (!user) {
    return unauthorized(request);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const id = body.id as string | undefined;
    const name = (body.name as string | undefined)?.trim();
    const description = (body.description as string | undefined)?.trim() || null;

    if (!id) {
      return badRequest(request, "ID категории обязателен");
    }

    const before = await import("@/lib/mockDb").then((m) => m.findExpenseCategoryById(id));
    const category = updateExpenseCategory(id, {
      name,
      description,
      updatedByUserId: user.id ?? null,
    });

    if (!category) {
      return fail(request, "not_found", "Категория не найдена", 404);
    }

    await logAdminAction({
      action: "update_expense_category",
      entity: "expense_category",
      entityId: category.id,
      before,
      after: { category },
      headers: request.headers,
    });

    return ok(request, { category });
  } catch (e) {
    return serverError(request, "Internal error", e);
  }
}

export async function DELETE(request: Request) {
  const accessCheck = await checkAdminOrOfficeAccess(request);
  if (!accessCheck.allowed) {
    return accessCheck.reason === "unauthorized" ? unauthorized(request) : forbidden(request);
  }
  
  await getSessionUser();

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return badRequest(request, "ID категории обязателен");
    }

    const before = await import("@/lib/mockDb").then((m) => m.findExpenseCategoryById(id));
    const deleted = deleteExpenseCategory(id);

    if (!deleted) {
      return fail(request, "not_found", "Категория не найдена", 404);
    }

    await logAdminAction({
      action: "delete_expense_category",
      entity: "expense_category",
      entityId: id,
      before,
      headers: request.headers,
    });

    return ok(request, { success: true });
  } catch (e) {
    return serverError(request, "Internal error", e);
  }
}
