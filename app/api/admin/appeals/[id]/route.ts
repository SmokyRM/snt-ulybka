import { updateAppealStatus, AppealStatus } from "@/lib/appeals";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { fail, forbidden, ok, serverError } from "@/lib/api/respond";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) {
    return forbidden(request);
  }
  try {
    const body = await request.json().catch(() => ({}));
    const status = body.status as AppealStatus | undefined;
    const adminReply = typeof body.adminReply === "string" ? body.adminReply : undefined;
    if (!status) {
      return fail(request, "validation_error", "status_required", 400);
    }
    const updated = await updateAppealStatus(
      params.id,
      status,
      adminReply,
      {
        id: user?.id,
        role: user?.role,
      },
    );
    if (!updated) {
      return fail(request, "not_found", "not_found", 404);
    }
    return ok(request, { appeal: updated });
  } catch (e) {
    return serverError(request, "Internal error", e);
  }
}
