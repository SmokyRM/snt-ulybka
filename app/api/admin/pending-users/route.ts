import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { getUsersByStatus } from "@/lib/mockDb";
import { forbidden, ok, serverError } from "@/lib/api/respond";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) {
    return forbidden(request, "Недостаточно прав");
  }
  try {
    const users = getUsersByStatus("pending");
    return ok(request, { users });
  } catch (e) {
    return serverError(request, "Internal error", e);
  }
}
