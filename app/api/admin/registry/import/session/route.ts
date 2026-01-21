import { getSessionUser } from "@/lib/session.server";
import { isAdminRole, isOfficeRole } from "@/lib/rbac";
import { patchSessionRow } from "@/lib/registry/core/importSession.store";
import { fail, forbidden, ok, unauthorized, serverError } from "@/lib/api/respond";

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return unauthorized(request, "Unauthorized");
  }

  const role = user.role;
  if (!isAdminRole(role) && !isOfficeRole(role)) {
    return forbidden(request, "Forbidden");
  }

  try {
    const body = (await request.json()) as {
      sessionId: string;
      rowIndex: number;
      patch: Partial<{
        fullName?: string;
        phone?: string | null;
        email?: string | null;
        sntStreetNumber?: string;
        plotNumber?: string;
        cityAddress?: string | null;
        note?: string | null;
      }>;
    };

    const { sessionId, rowIndex, patch } = body;

    if (!sessionId || typeof rowIndex !== "number") {
      return fail(request, "validation_error", "sessionId and rowIndex are required", 400);
    }

    const updatedSession = patchSessionRow(sessionId, rowIndex, patch);

    if (!updatedSession) {
      return fail(request, "not_found", "Session not found or expired", 404);
    }

    // Find the updated row
    const updatedRow = updatedSession.rows.find((r) => r.rowIndex === rowIndex);
    if (!updatedRow) {
      return fail(request, "not_found", "Row not found", 404);
    }

    return ok(request, {
      rowErrors: updatedSession.rows.map((r) => ({
        rowIndex: r.rowIndex,
        errors: r.errors,
      })),
      summary: updatedSession.summary,
    });
  } catch (error) {
    console.error("Registry import session patch error:", error);
    return serverError(request, "Ошибка обновления строки", error);
  }
}
