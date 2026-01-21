import { NextResponse } from "next/server";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import { findPaymentImportById, listPaymentImportRows } from "@/lib/mockDb";
import { unauthorized, forbidden, fail } from "@/lib/api/respond";

function esc(v: string): string {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** CSV ошибок: rowNumber, rawLine, errorMessage. BOM. Admin + office. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized(request);
    if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
      return forbidden(request);
    }

    const { id } = await params;
    const import_ = findPaymentImportById(id);
    if (!import_) return fail(request, "not_found", "import not found", 404);

  const rows = listPaymentImportRows(id);
  const errorRows = rows.filter((r) => r.validationErrors && r.validationErrors.length > 0);

  const header = "rowNumber,rawLine,errorMessage";
  const lines = errorRows.map((r) => {
    const rawLine = (r.rawData && typeof (r.rawData as { rawLine?: string }).rawLine === "string")
      ? (r.rawData as { rawLine: string }).rawLine
      : "";
    const errorMessage = (r.validationErrors || []).join("; ");
    return [String(r.rowIndex), rawLine, errorMessage].map(esc).join(",");
  });

    const csv = "\uFEFF" + header + "\n" + lines.join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="payment-import-${id}-errors.csv"`,
      },
    });
  } catch (error) {
    // CSV endpoint - can't use serverError as it returns JSON
    return new NextResponse("Internal server error", { status: 500 });
  }
}
