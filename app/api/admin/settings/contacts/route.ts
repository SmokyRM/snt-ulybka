import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { getContactsSetting, updateContactsSetting } from "@/lib/settings.server";
import { logAdminAction } from "@/lib/audit";
import { forbidden, ok, serverError, unauthorized } from "@/lib/api/respond";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized(request);
  if (!hasAdminAccess(user)) return forbidden(request);

  try {
    const setting = getContactsSetting();
    return ok(request, setting);
  } catch (e) {
    return serverError(request, "Internal error", e);
  }
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized(request);
  if (!hasAdminAccess(user)) return forbidden(request);

  try {
    const body = await request.json().catch(() => ({}));
    const before = getContactsSetting();

    const updated = updateContactsSetting(
      {
        phone: (body.phone as string) || "",
        email: (body.email as string) || "",
        address: (body.address as string) || "",
      },
      {
        actorUserId: user.id ?? null,
        actorRole: user.role ?? null,
      }
    );

    await logAdminAction({
      action: "update_contacts",
      entity: "contacts",
      entityId: "contacts",
      before: before.value,
      after: updated.value,
      headers: request.headers,
    });

    return ok(request, updated);
  } catch (e) {
    return serverError(request, "Internal error", e);
  }
}
