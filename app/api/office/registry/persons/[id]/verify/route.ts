import { ok, fail, forbidden, serverError } from "@/lib/api/respond";
import { getSessionUser } from "@/lib/session.server";
import { isOfficeRole } from "@/lib/rbac";
import { getPerson, updatePerson } from "@/lib/registry/core/persons.store";
import { findUserById, upsertUser } from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    const role = user?.role;
    if (!user || !isOfficeRole(role)) {
      return forbidden(request);
    }

    const { id } = await params;

    const person = getPerson(id);
    if (!person) {
      return fail(request, "not_found", "Человек не найден", 404);
    }

    const before = { ...person };

    // Update person status
    const updated = updatePerson(id, {
      verificationStatus: "verified",
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
          status: "verified",
          role: linkedUser.role,
        });
      }
    }

    await logAdminAction({
      action: "verify_person",
      entity: "person",
      entityId: id,
      before,
      after: updated,
      headers: request.headers,
    });

    return ok(request, { person: updated });
  } catch (error) {
    return serverError(request, "Ошибка при верификации пользователя", error);
  }
}
