import { getSessionUser } from "@/lib/session.server";
import { isAdminRole, isOfficeRole } from "@/lib/rbac";
import { parseRegistryCsv } from "@/lib/registry/core/csvParser";
import { createSession } from "@/lib/registry/core/importSession.store";
import { fail, forbidden, ok, unauthorized, serverError } from "@/lib/api/respond";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return unauthorized(request, "Unauthorized");
  }

  const role = user.role;
  if (!isAdminRole(role) && !isOfficeRole(role)) {
    return forbidden(request, "Forbidden");
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return fail(request, "validation_error", "Файл не предоставлен", 400);
    }

    const text = await file.text();
    // Parse with rawRows = true to get row-level data
    const result = parseRegistryCsv(text, true);

    if (!result.rawRows) {
      return fail(request, "internal_error", "Ошибка парсинга CSV", 500);
    }

    // Create import session
    const session = createSession(result.rawRows);

    // Convert Map to array for backward compatibility (if needed)
    const personsArray = Array.from(result.persons.entries()).map(([key, person]) => ({
      key,
      ...person,
    }));

    return ok(request, {
      importSessionId: session.id,
      persons: personsArray, // Keep for backward compatibility
      errors: result.errors,
      rows: session.rows, // Raw rows for editing
      rowErrors: session.rows.map((r) => ({
        rowIndex: r.rowIndex,
        errors: r.errors,
      })),
      summary: {
        totalPersons: personsArray.length,
        totalPlots: personsArray.reduce((sum, p) => sum + p.plots.length, 0),
        errorsCount: result.errors.length,
        totalRows: session.summary.totalRows,
        errorRows: session.summary.errorRows,
        validRows: session.summary.validRows,
      },
    });
  } catch (error) {
    console.error("Registry CSV preview error:", error);
    return serverError(request, "Ошибка обработки CSV", error);
  }
}
