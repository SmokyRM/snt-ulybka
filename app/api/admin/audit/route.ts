import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { listAuditLogs } from "@/lib/mockDb";
import { forbidden, ok, serverError, unauthorized } from "@/lib/api/respond";

const parseFilters = (request: Request) => {
  const url = new URL(request.url);
  const params = url.searchParams;
  const action = params.get("action");
  const from = params.get("from");
  const to = params.get("to");
  const limitRaw = params.get("limit");
  const limit = limitRaw ? Math.max(1, Math.min(200, Number(limitRaw))) : 50;
  return {
    action: action || undefined,
    from: from || undefined,
    to: to || undefined,
    limit: Number.isFinite(limit) ? limit : 50,
  };
};

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return unauthorized(request);
  }
  if (!hasAdminAccess(user)) {
    return forbidden(request);
  }
  try {
    const filters = parseFilters(request);
    const logs = listAuditLogs(filters);
    return ok(request, { logs });
  } catch (e) {
    return serverError(request, "Internal error", e);
  }
}
