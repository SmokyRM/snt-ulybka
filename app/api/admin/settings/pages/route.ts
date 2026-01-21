import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { getSetting, setSetting } from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";
import { forbidden, ok, serverError, unauthorized } from "@/lib/api/respond";

type PublicPageSettings = {
  homeTitle?: string;
  homeDescription?: string;
  aboutTitle?: string;
  aboutDescription?: string;
  helpTitle?: string;
  helpDescription?: string;
};

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized(request);
  if (!hasAdminAccess(user)) return forbidden(request);

  try {
    const setting = getSetting<PublicPageSettings>("public_pages") || {
      key: "public_pages",
      value: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
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
    const before = getSetting<PublicPageSettings>("public_pages");

    const updated = setSetting<PublicPageSettings>("public_pages", {
      homeTitle: (body.homeTitle as string) || "",
      homeDescription: (body.homeDescription as string) || "",
      aboutTitle: (body.aboutTitle as string) || "",
      aboutDescription: (body.aboutDescription as string) || "",
      helpTitle: (body.helpTitle as string) || "",
      helpDescription: (body.helpDescription as string) || "",
    });

    await logAdminAction({
      action: "update_public_pages",
      entity: "public_pages",
      entityId: "public_pages",
      before: before?.value || {},
      after: updated.value,
      headers: request.headers,
    });

    return ok(request, updated);
  } catch (e) {
    return serverError(request, "Internal error", e);
  }
}
