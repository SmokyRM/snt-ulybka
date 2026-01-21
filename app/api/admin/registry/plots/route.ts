import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { listPlotsWithFilters } from "@/lib/mockDb";
import { forbidden, ok, unauthorized, serverError } from "@/lib/api/respond";

const parseQuery = (request: Request) => {
  const url = new URL(request.url);
  const query = url.searchParams.get("query");
  const page = Number(url.searchParams.get("page") || "1");
  const limit = Number(url.searchParams.get("limit") || "50");
  return { query, page: Number.isFinite(page) && page > 0 ? page : 1, limit: Number.isFinite(limit) && limit > 0 ? limit : 50 };
};

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return unauthorized(request, "unauthorized");
    }
    if (!hasAdminAccess(user)) {
      return forbidden(request, "forbidden");
    }
    const { query, page, limit } = parseQuery(request);
    const { items, total } = listPlotsWithFilters({ query, page, pageSize: limit });
    return ok(request, { plots: items, total, page, limit });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
