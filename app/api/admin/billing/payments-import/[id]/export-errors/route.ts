import { NextResponse } from "next/server";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import { unauthorized, forbidden, fail } from "@/lib/api/respond";
import { findPaymentImportById, listPaymentImportRows } from "@/lib/mockDb";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return unauthorized(request);
  if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
    return forbidden(request);
  }

  const { id } = await params;
  const import_ = findPaymentImportById(id);
  if (!import_) {
    return fail(request, "not_found", "import not found", 404);
  }

  const rows = listPaymentImportRows(id);
  const errorRows = rows.filter(
    (r) => (r.validationErrors && r.validationErrors.length > 0) || !r.matchedPlotId
  );

  // Build CSV
  const csvRows: string[] = [];
  csvRows.push("\uFEFFСтрока,Дата,Сумма,Назначение,ФИО,Телефон,Участок,Ошибки");

  errorRows.forEach((row) => {
    const errors = [
      ...(row.validationErrors || []),
      ...(row.matchedPlotId ? [] : ["Не найден участок"]),
    ].join("; ");

    csvRows.push(
      [
        row.rowIndex,
        row.date,
        row.amount.toFixed(2),
        row.purpose || "",
        row.fullName || "",
        row.phone || "",
        row.plotNumber || "",
        errors,
      ].join(",")
    );
  });

  const csv = csvRows.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payment-import-${id}-errors.csv"`,
    },
  });
}
