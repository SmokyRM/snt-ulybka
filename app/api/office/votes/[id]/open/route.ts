export const runtime = "nodejs";

import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { openVote, getVote } from "@/lib/votes.pg";
import { logAdminAction } from "@/lib/audit";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission(request, "votes.manage", { route: "/api/office/votes/:id/open" });
  if (guard instanceof Response) return guard;

  try {
    const { id } = await params;
    const existing = await getVote(id);
    if (!existing) return fail(request, "not_found", "Vote not found", 404);
    const vote = await openVote(id, guard.session.id ?? null);
    if (!vote) return fail(request, "not_found", "Vote not found", 404);

    await logAdminAction({
      action: "votes.open",
      entity: "votes",
      entityId: id,
      meta: { meetingId: vote.meetingId },
      headers: request.headers,
    });
    return ok(request, { vote });
  } catch (error) {
    return serverError(request, "Ошибка открытия голосования", error);
  }
}
