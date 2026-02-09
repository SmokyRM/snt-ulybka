export const runtime = "nodejs";

import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { closeMeeting, getMeetingById, hasPgConnection } from "@/lib/meetings.pg";
import { logAdminAction } from "@/lib/audit";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission(request, "meetings.manage", { route: "/api/office/meetings/:id/close" });
  if (guard instanceof Response) return guard;
  if (!hasPgConnection()) return fail(request, "pg_missing", "Postgres не настроен", 503);

  try {
    const { id } = await params;
    const existing = await getMeetingById(id);
    if (!existing) return fail(request, "not_found", "Meeting not found", 404);
    const meeting = await closeMeeting(id, guard.session.id ?? null);
    if (!meeting) return fail(request, "not_found", "Meeting not found", 404);

    await logAdminAction({
      action: "meetings.close",
      entity: "meetings",
      entityId: id,
      before: { status: existing.status },
      after: { status: meeting.status },
      headers: request.headers,
    });

    return ok(request, { meeting });
  } catch (error) {
    return serverError(request, "Ошибка закрытия", error);
  }
}
