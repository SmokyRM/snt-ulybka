import { NextResponse } from "next/server";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { restoreSettingVersion } from "@/lib/settings.server";
import { logAdminAction } from "@/lib/audit";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasAdminAccess(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const versionId = (body.versionId as string | undefined)?.trim();
  const comment = (body.comment as string | undefined)?.trim() || undefined;
  if (!versionId) {
    return NextResponse.json({ error: "versionId required" }, { status: 400 });
  }
  const restored = restoreSettingVersion({
    versionId,
    actorUserId: user.id ?? null,
    comment,
  });
  if (!restored) {
    return NextResponse.json({ error: "version not found" }, { status: 404 });
  }
  await logAdminAction({
    action: "restore_social_links_version",
    entity: "social_links",
    entityId: restored.sourceVersion.id,
    before: restored.sourceVersion.before,
    after: restored.sourceVersion.after,
    headers: request.headers,
  });
  return NextResponse.json({ ok: true });
}
