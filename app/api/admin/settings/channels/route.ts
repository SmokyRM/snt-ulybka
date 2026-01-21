import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { getOfficialChannelsSettingServer, updateOfficialChannelsSetting } from "@/lib/settings.server";
import type { OfficialChannels } from "@/config/officialChannels";
import { logAdminAction } from "@/lib/audit";
import { forbidden, ok, serverError, unauthorized } from "@/lib/api/respond";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized(request);
  if (!hasAdminAccess(user)) return forbidden(request);

  try {
    const setting = getOfficialChannelsSettingServer();
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
    const before = getOfficialChannelsSettingServer();

    const value: OfficialChannels = {
      vk: (body.vk as string) || "",
      telegram: (body.telegram as string) || "",
      email: (body.email as string) || "",
      phone: (body.phone as string) || "",
    };

    const updated = updateOfficialChannelsSetting(value, {
      actorUserId: user.id ?? null,
      actorRole: user.role ?? null,
    });

    await logAdminAction({
      action: "update_channels",
      entity: "social_links",
      entityId: "official_channels",
      before: before.value,
      after: updated.value,
      headers: request.headers,
    });

    return ok(request, updated);
  } catch (e) {
    return serverError(request, "Internal error", e);
  }
}
