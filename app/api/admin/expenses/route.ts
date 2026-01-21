import { getSessionUser } from "@/lib/session.server";
import { addExpense, updateExpense, listExpenses, findExpenseCategoryById } from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";
import { checkAdminOrOfficeAccess } from "@/lib/rbac/accessCheck";
import { badRequest, fail, forbidden, ok, serverError, unauthorized } from "@/lib/api/respond";

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
    const date = (body.date as string | undefined)?.trim();
    const amount = Number(body.amount);
    const categoryId = (body.categoryId as string | undefined)?.trim();
    const description = (body.description as string | undefined)?.trim();
    const vendor = (body.vendor as string | undefined)?.trim() || null;
    const targetFundId = (body.targetFundId as string | undefined)?.trim() || null;
    const attachment = body.attachment as
      | { url: string; filename: string; mime?: string | null; size?: number | null }
      | null
      | undefined;

    if (!date || Number.isNaN(new Date(date).getTime())) {
      return badRequest(request, "Некорректная дата");
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return badRequest(request, "Некорректная сумма");
    }
    if (!categoryId) return badRequest(request, "Категория обязательна");
    if (!description) return badRequest(request, "Описание обязательно");

    const category = findExpenseCategoryById(categoryId);
    if (!category) {
      return badRequest(request, "Категория не найдена");
    }

    const expense = addExpense({
      date: new Date(date).toISOString(),
      amount,
      categoryId,
      description,
      vendor,
      targetFundId,
      attachment: attachment || null,
      createdByUserId: user.id ?? null,
    });

    await logAdminAction({
      action: "create_expense",
      entity: "expense",
      entityId: expense.id,
      after: { expense, categoryName: category.name },
      headers: request.headers,
    });

    return ok(request, { expense }, { status: 201 });
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
    const date = (body.date as string | undefined)?.trim();
    const amount = Number(body.amount);
    const categoryId = (body.categoryId as string | undefined)?.trim();
    const description = (body.description as string | undefined)?.trim();
    const vendor = (body.vendor as string | undefined)?.trim() || null;
    const targetFundId = (body.targetFundId as string | undefined)?.trim() || null;
    const attachment = body.attachment as
      | { url: string; filename: string; mime?: string | null; size?: number | null }
      | null
      | undefined;

    if (!id) {
      return badRequest(request, "ID расхода обязателен");
    }

    const { listExpenses: listExpensesFn } = await import("@/lib/mockDb");
    const before = listExpensesFn({}).find((e) => e.id === id);
    if (!before) {
      return fail(request, "not_found", "Расход не найден", 404);
    }

    if (categoryId) {
      const category = findExpenseCategoryById(categoryId);
      if (!category) {
        return badRequest(request, "Категория не найдена");
      }
    }

    const expense = updateExpense(id, {
      date,
      amount: Number.isFinite(amount) && amount > 0 ? amount : undefined,
      categoryId,
      description,
      vendor,
      targetFundId,
      attachment: attachment !== undefined ? attachment : undefined,
      updatedByUserId: user.id ?? null,
    });

    if (!expense) {
      return fail(request, "not_found", "Расход не найден", 404);
    }

    await logAdminAction({
      action: "update_expense",
      entity: "expense",
      entityId: expense.id,
      before,
      after: { expense },
      headers: request.headers,
    });

    return ok(request, { expense });
  } catch (e) {
    return serverError(request, "Internal error", e);
  }
}

export async function GET(request: Request) {
  const accessCheck = await checkAdminOrOfficeAccess(request);
  if (!accessCheck.allowed) {
    return accessCheck.reason === "unauthorized" ? unauthorized(request) : forbidden(request);
  }
  
  await getSessionUser();

  try {
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const categoryId = url.searchParams.get("categoryId");
    const year = url.searchParams.get("year");
    const month = url.searchParams.get("month");

    let expenses = listExpenses({ from, to, categoryId: categoryId || null });

    // Filter by year/month if provided
    if (year && month) {
      const yearNum = Number(year);
      const monthNum = Number(month);
      if (Number.isInteger(yearNum) && Number.isInteger(monthNum) && monthNum >= 1 && monthNum <= 12) {
        const periodStart = new Date(yearNum, monthNum - 1, 1);
        const periodEnd = new Date(yearNum, monthNum, 0, 23, 59, 59);
        expenses = expenses.filter((e) => {
          const date = new Date(e.date);
          return date >= periodStart && date <= periodEnd;
        });
      }
    }

    // Enrich with category names
    const enriched = expenses.map((e) => {
      const category = findExpenseCategoryById(e.categoryId);
      return {
        ...e,
        categoryName: category?.name || "Неизвестная категория",
      };
    });

    const total = enriched.reduce((sum, e) => sum + e.amount, 0);

    // Group by period for summary
    const summaryByPeriod: Record<string, { count: number; total: number }> = {};
    enriched.forEach((e) => {
      const date = new Date(e.date);
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!summaryByPeriod[period]) {
        summaryByPeriod[period] = { count: 0, total: 0 };
      }
      summaryByPeriod[period].count += 1;
      summaryByPeriod[period].total += e.amount;
    });

    return ok(request, {
      items: enriched,
      total,
      summaryByPeriod: Object.entries(summaryByPeriod)
        .map(([period, data]) => ({ period, ...data }))
        .sort((a, b) => b.period.localeCompare(a.period)),
    });
  } catch (e) {
    return serverError(request, "Internal error", e);
  }
}
