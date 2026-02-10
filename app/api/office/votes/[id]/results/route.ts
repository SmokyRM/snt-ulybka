export const runtime = "nodejs";

import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { getVote, computeVoteResults } from "@/lib/votes.pg";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission(request, "votes.view", { route: "/api/office/votes/:id/results" });
  if (guard instanceof Response) return guard;

  try {
    const { id } = await params;
    const vote = await getVote(id);
    if (!vote) return fail(request, "not_found", "Vote not found", 404);
    const results = await computeVoteResults(vote.id, vote.quorumType, vote.quorumRequired);
    return ok(request, { vote, results });
  } catch (error) {
    return serverError(request, "Ошибка получения результатов", error);
  }
}
