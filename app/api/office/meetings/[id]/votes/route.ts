export const runtime = "nodejs";

import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { getMeetingById, listAgendaItems, hasPgConnection } from "@/lib/meetings.pg";
import { createVote } from "@/lib/votes.pg";
import { logAdminAction } from "@/lib/audit";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission(request, "votes.manage", { route: "/api/office/meetings/:id/votes" });
  if (guard instanceof Response) return guard;
  if (!hasPgConnection()) return fail(request, "pg_missing", "Postgres не настроен", 503);

  try {
    const { id } = await params;
    const meeting = await getMeetingById(id);
    if (!meeting) return fail(request, "not_found", "Meeting not found", 404);
    const body = await request.json().catch(() => ({}));
    const agendaItemId = typeof body.agendaItemId === "string" ? body.agendaItemId : null;
    const quorumType = body.quorumType === "plots" ? "plots" : "persons";
    const quorumRequired = typeof body.quorumRequired === "number" ? body.quorumRequired : 0.5;
    if (!agendaItemId) return fail(request, "validation_error", "agendaItemId обязателен", 400);
    const agenda = await listAgendaItems(id);
    if (!agenda.some((item) => item.id === agendaItemId)) {
      return fail(request, "validation_error", "agendaItemId не найден", 400);
    }

    const vote = await createVote({
      meetingId: id,
      agendaItemId,
      quorumType,
      quorumRequired,
      createdBy: guard.session.id ?? null,
    });

    await logAdminAction({
      action: "votes.create",
      entity: "votes",
      entityId: vote.id,
      meta: { meetingId: id, agendaItemId },
      headers: request.headers,
    });

    return ok(request, { vote });
  } catch (error) {
    return serverError(request, "Ошибка создания голосования", error);
  }
}
