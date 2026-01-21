import { NextResponse } from "next/server";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import { listExpenses, findExpenseCategoryById } from "@/lib/mockDb";
import { forbidden, serverError, unauthorized } from "@/lib/api/respond";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized(request);
  
  const role = user.role;
  if (!hasAdminAccess(user) && !isOfficeRole(role) && !isAdminRole(role)) {
    return forbidden(request);
  }

  try {
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const categoryId = url.searchParams.get("categoryId");
    const year = url.searchParams.get("year");
    const month = url.searchParams.get("month");

    let expenses = listExpenses({ from, to, categoryId: categoryId || null });

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

    const toCsvValue = (value: string | number | null | undefined) => {
      if (value === null || value === undefined) return '""';
      const str = typeof value === "number" ? value.toString() : value;
      const escaped = str.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const header = [
      "Дата",
      "Сумма",
      "Категория",
      "Описание",
      "Подрядчик",
      "Вложение",
      "Создан",
      "Обновлён",
    ];

    const rows = expenses.map((e) => {
      const category = findExpenseCategoryById(e.categoryId);
      return [
        toCsvValue(new Date(e.date).toLocaleDateString("ru-RU")),
        toCsvValue(e.amount),
        toCsvValue(category?.name || "Неизвестная категория"),
        toCsvValue(e.description),
        toCsvValue(e.vendor || ""),
        toCsvValue(e.attachment?.filename || ""),
        toCsvValue(new Date(e.createdAt).toLocaleString("ru-RU")),
        toCsvValue(e.updatedAt ? new Date(e.updatedAt).toLocaleString("ru-RU") : ""),
      ].join(";");
    });

    const content = ["\uFEFF" + header.map(toCsvValue).join(";"), ...rows].join("\r\n");
    const filename = `expenses_${year || "all"}-${month?.padStart(2, "0") || "all"}.csv`;

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    return serverError(request, "Internal error", e);
  }
}
