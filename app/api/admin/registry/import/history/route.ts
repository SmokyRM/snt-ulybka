import { getSessionUser } from "@/lib/session.server";
import { isAdminRole, normalizeRole } from "@/lib/rbac";
import { listRegistryImports } from "@/lib/mockDb";
import { fail, forbidden, ok, unauthorized, serverError } from "@/lib/api/respond";

export async function GET(request: Request) {
  try {
    // Check production
    if (process.env.NODE_ENV === "production") {
      return fail(request, "not_configured", "Registry import is disabled in production", 403);
    }

    const user = await getSessionUser();
    if (!user) {
      return unauthorized(request, "unauthorized");
    }

    const normalizedRole = normalizeRole(user.role);
    if (!isAdminRole(normalizedRole)) {
      return forbidden(request, "forbidden");
    }

    const imports = listRegistryImports();
    return ok(request, { items: imports });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
