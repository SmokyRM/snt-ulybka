export const runtime = "nodejs";

import { ok, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { isResidentRole } from "@/lib/rbac";
import { listPublishedMeetings, hasPgConnection } from "@/lib/meetings.pg";

export async function GET(request: Request) {
  const session = await getEffectiveSessionUser().catch(() => null);
  if (!session) return unauthorized(request);
  if (!isResidentRole(session.role)) return forbidden(request);

  try {
    if (!hasPgConnection()) return ok(request, { meetings: [] });
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");
    const meetings = await listPublishedMeetings({
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
    return ok(request, { meetings });
  } catch (error) {
    return serverError(request, "Ошибка загрузки собраний", error);
  }
}
