export const runtime = "nodejs";

import { ok, unauthorized, forbidden, fail, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { isResidentRole } from "@/lib/rbac";
import { getVote, castVote } from "@/lib/votes.pg";
import { getUserPlots } from "@/lib/plots";
import { logAdminAction } from "@/lib/audit";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getEffectiveSessionUser().catch(() => null);
  if (!session) return unauthorized(request);
  if (!isResidentRole(session.role)) return forbidden(request);

  try {
    const { id } = await params;
    const vote = await getVote(id);
    if (!vote) return fail(request, "not_found", "Vote not found", 404);
    if (vote.status !== "open") {
      return fail(request, "vote_closed", "Голосование закрыто", 409);
    }
    const body = await request.json().catch(() => ({}));
    const choice = body.choice === "yes" || body.choice === "no" || body.choice === "abstain" ? body.choice : null;
    const plotId = typeof body.plotId === "string" ? body.plotId : null;
    if (!choice) return fail(request, "validation_error", "choice обязателен", 400);
    if (vote.quorumType === "plots") {
      if (!plotId) return fail(request, "validation_error", "plotId обязателен", 400);
      const plots = await getUserPlots(session.id);
      const owned = plots.some((plot) => plot.plotId === plotId);
      if (!owned) return fail(request, "not_found", "Plot not found", 404);
    }
    const ballot = await castVote({
      voteId: vote.id,
      userId: session.id ?? "",
      plotId: plotId,
      choice,
      source: "cabinet",
    });
    await logAdminAction({
      action: "votes.cast",
      entity: "votes",
      entityId: vote.id,
      meta: { choice, plotId },
      headers: request.headers,
    });
    return ok(request, { ballot });
  } catch (error) {
    return serverError(request, "Ошибка голосования", error);
  }
}
