import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { isAdminRole } from "@/lib/rbac";
import { getPerson, updatePerson } from "@/lib/registry/core/persons.store";
import { findUserById, upsertUser } from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";
import { fail, forbidden, ok, serverError } from "@/lib/api/respond";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!hasAdminAccess(user) && !isAdminRole(user?.role)) {
      return forbidden(request, "Недостаточно прав. Только администратор может отклонять.");
    }

    const { id } = await params;

    const person = getPerson(id);
    if (!person) {
      return fail(request, "not_found", "Человек не найден", 404);
    }

    const before = { ...person };

    // Update person status
    const updated = updatePerson(id, {
      verificationStatus: "rejected",
    });

    if (!updated) {
      return serverError(request, "Не удалось обновить статус");
    }

    // Update user status if linked
    if (person.userId) {
      const linkedUser = findUserById(person.userId);
      if (linkedUser) {
        upsertUser({
          contact: linkedUser.phone || linkedUser.email || "",
          status: "rejected",
          role: linkedUser.role,
        });
      }
    }

    await logAdminAction({
      action: "reject_person",
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
