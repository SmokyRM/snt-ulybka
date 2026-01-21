import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import { getPerson, updatePerson } from "@/lib/registry/core/persons.store";
import { logAdminAction } from "@/lib/audit";
import { fail, forbidden, ok, serverError } from "@/lib/api/respond";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    const role = user?.role;
    if (!hasAdminAccess(user) && !isOfficeRole(role) && !isAdminRole(role)) {
      return forbidden(request, "Недостаточно прав");
    }

    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      fullName?: string;
      phone?: string | null;
      email?: string | null;
    };

    const person = getPerson(id);
    if (!person) {
      return fail(request, "not_found", "Человек не найден", 404);
    }

    const before = { ...person };

    const updates: Parameters<typeof updatePerson>[1] = {};
    if (body.fullName !== undefined) updates.fullName = body.fullName.trim();
    if (body.phone !== undefined) updates.phone = body.phone?.trim() || null;
    if (body.email !== undefined) updates.email = body.email?.trim()?.toLowerCase() || null;

    const updated = updatePerson(id, updates);
    if (!updated) {
      return serverError(request, "Не удалось обновить данные");
    }

    await logAdminAction({
      action: "update_person",
      entity: "person",
      entityId: id,
      before,
      after: updated,
      headers: request.headers,
    });

    return ok(request, { person: updated });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
