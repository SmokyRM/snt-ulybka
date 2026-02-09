export const runtime = "nodejs";

import { ok, unauthorized, forbidden, fail, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { isResidentRole } from "@/lib/rbac";
import { getVote, computeVoteResults } from "@/lib/votes.pg";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getEffectiveSessionUser().catch(() => null);
  if (!session) return unauthorized(request);
  if (!isResidentRole(session.role)) return forbidden(request);

  try {
    const { id } = await params;
    const vote = await getVote(id);
    if (!vote) return fail(request, "not_found", "Vote not found", 404);
    if (vote.status !== "closed") {
      return fail(request, "not_ready", "Результаты ещё не опубликованы", 409);
    }
    const results = await computeVoteResults(vote.id, vote.quorumType, vote.quorumRequired);
    return ok(request, { vote, results });
  } catch (error) {
    return serverError(request, "Ошибка получения результатов", error);
  }
}
