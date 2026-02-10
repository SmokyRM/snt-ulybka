export const runtime = "nodejs";

import { ok, unauthorized, forbidden, fail, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { isResidentRole } from "@/lib/rbac";
import { getMeetingById, hasPgConnection } from "@/lib/meetings.pg";
import { listMeetingVotes } from "@/lib/votes.pg";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getEffectiveSessionUser().catch(() => null);
  if (!session) return unauthorized(request);
  if (!isResidentRole(session.role)) return forbidden(request);

  try {
    if (!hasPgConnection()) return ok(request, { votes: [] });
    const { id } = await params;
    const meeting = await getMeetingById(id);
    if (!meeting || (meeting.status !== "published" && meeting.status !== "closed")) {
      return fail(request, "not_found", "Meeting not found", 404);
    }
    const votes = await listMeetingVotes(id);
    return ok(request, { votes });
  } catch (error) {
    return serverError(request, "Ошибка загрузки голосований", error);
  }
}
