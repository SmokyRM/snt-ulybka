import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { restoreSettingVersion } from "@/lib/settings.server";
import { logAdminAction } from "@/lib/audit";
import { badRequest, fail, forbidden, ok, serverError, unauthorized } from "@/lib/api/respond";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized(request);
  if (!hasAdminAccess(user)) return forbidden(request);
  try {
    const body = await request.json().catch(() => ({}));
    const versionId = (body.versionId as string | undefined)?.trim();
    const comment = (body.comment as string | undefined)?.trim() || undefined;
    if (!versionId) {
      return badRequest(request, "versionId required");
    }
    const restored = restoreSettingVersion({
      versionId,
      actorUserId: user.id ?? null,
      comment,
    });
    if (!restored) {
      return fail(request, "not_found", "version not found", 404);
    }
    await logAdminAction({
      action: "restore_social_links_version",
      entity: "social_links",
      entityId: restored.sourceVersion.id,
      before: restored.sourceVersion.before,
      after: restored.sourceVersion.after,
      headers: request.headers,
    });
    return ok(request, { restored: true });
  } catch (e) {
    return serverError(request, "Internal error", e);
  }
}
