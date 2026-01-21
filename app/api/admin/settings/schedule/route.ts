import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { getScheduleSetting, updateScheduleSetting } from "@/lib/settings.server";
import { logAdminAction } from "@/lib/audit";
import { forbidden, ok, serverError, unauthorized } from "@/lib/api/respond";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized(request);
  if (!hasAdminAccess(user)) return forbidden(request);

  try {
    const setting = getScheduleSetting();
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
    const before = getScheduleSetting();

    const items = Array.isArray(body.items)
      ? (body.items as Array<{ day: string; hours: string }>).filter((item) => item.day && item.hours)
      : [];

    const updated = updateScheduleSetting(
      { items },
      {
        actorUserId: user.id ?? null,
        actorRole: user.role ?? null,
      }
    );

    await logAdminAction({
      action: "update_schedule",
      entity: "schedule",
      entityId: "schedule",
      before: before.value,
      after: updated.value,
      headers: request.headers,
    });

    return ok(request, updated);
  } catch (e) {
    return serverError(request, "Internal error", e);
  }
}
