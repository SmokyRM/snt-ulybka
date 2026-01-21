import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import { detectIssues, filterIssues, type DataIssueType } from "@/lib/registry/core/issues.store";
import { forbidden, ok, unauthorized, serverError } from "@/lib/api/respond";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return unauthorized(request, "Unauthorized");
    }

    const role = user.role;
    if (!hasAdminAccess(user) && !isOfficeRole(role) && !isAdminRole(role)) {
      return forbidden(request, "Forbidden");
    }

    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get("type");
    const severityParam = searchParams.get("severity");
    const personIdParam = searchParams.get("personId");

    const { issues, summary } = detectIssues();

    const filtered = filterIssues(issues, {
      type: typeParam ? (typeParam as DataIssueType) : undefined,
      severity: severityParam
        ? (severityParam as "low" | "medium" | "high")
        : undefined,
      personId: personIdParam || undefined,
    });

    return ok(request, {
      issues: filtered,
      summary,
      total: filtered.length,
    });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
