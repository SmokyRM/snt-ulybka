export const runtime = "nodejs";

import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { replaceAgendaItems, getMeetingById, hasPgConnection } from "@/lib/meetings.pg";
import { logAdminAction } from "@/lib/audit";

type AgendaItemInput = {
  position?: number;
  title?: string;
  description?: string;
  requiresVote?: boolean;
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission(request, "meetings.manage", { route: "/api/office/meetings/:id/agenda" });
  if (guard instanceof Response) return guard;
  if (!hasPgConnection()) return fail(request, "pg_missing", "Postgres не настроен", 503);

  try {
    const { id } = await params;
    const meeting = await getMeetingById(id);
    if (!meeting) return fail(request, "not_found", "Meeting not found", 404);

    const body = await request.json().catch(() => ({}));
    const items = Array.isArray(body.items) ? body.items : [];
    const normalized = (items as AgendaItemInput[]).map((item, index) => ({
      meetingId: id,
      position: Number.isFinite(item.position) ? Number(item.position) : index,
      title: typeof item.title === "string" ? item.title : "",
      description: typeof item.description === "string" ? item.description : null,
      requiresVote: Boolean(item.requiresVote),
    })).filter((item: { title: string }) => item.title.trim().length > 0);

    const agenda = await replaceAgendaItems(id, normalized);
    await logAdminAction({
      action: "meetings.agenda.update",
      entity: "meetings",
      entityId: id,
      meta: { count: agenda.length },
      headers: request.headers,
    });
    return ok(request, { agenda });
  } catch (error) {
    return serverError(request, "Ошибка обновления повестки", error);
  }
}
