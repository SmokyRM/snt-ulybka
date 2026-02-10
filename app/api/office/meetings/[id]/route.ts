export const runtime = "nodejs";

import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import {
  getMeetingById,
  updateMeeting,
  listAgendaItems,
  listMaterials,
  listQuestions,
  hasPgConnection,
} from "@/lib/meetings.pg";
import { listMeetingVotes } from "@/lib/votes.pg";
import { logAdminAction } from "@/lib/audit";
import { sql } from "@/db/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission(request, "meetings.manage", { route: "/api/office/meetings/:id" });
    if (guard instanceof Response) return guard;
    if (!hasPgConnection()) return ok(request, { meeting: null });
    const { id } = await params;
    const meeting = await getMeetingById(id);
    if (!meeting) return fail(request, "not_found", "Meeting not found", 404);
    const agenda = await listAgendaItems(id);
    const materials = await listMaterials(id);
    const questions = await listQuestions(id, true);
    const votes = await listMeetingVotes(id);
    return ok(request, { meeting, agenda, materials, questions, votes });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission(request, "meetings.manage", { route: "/api/office/meetings/:id" });
    if (guard instanceof Response) return guard;
    if (!hasPgConnection()) return fail(request, "pg_missing", "Postgres не настроен", 503);
    const { id } = await params;
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return fail(request, "validation_error", "Invalid payload", 400);

    const existing = await getMeetingById(id);
    if (!existing) return fail(request, "not_found", "Meeting not found", 404);

    const updated = await updateMeeting(id, {
      title: typeof body.title === "string" ? body.title.trim() : undefined,
      type: body.type === "board" || body.type === "extra" ? body.type : undefined,
      startsAt: typeof body.startsAt === "string" ? body.startsAt : null,
      endsAt: typeof body.endsAt === "string" ? body.endsAt : null,
      status: body.status === "archived" ? "archived" : undefined,
      updatedBy: guard.session.id ?? null,
    });
    if (!updated) return serverError(request, "Failed to update");

    await logAdminAction({
      action: "meetings.update",
      entity: "meetings",
      entityId: id,
      before: { title: existing.title, status: existing.status },
      after: { title: updated.title, status: updated.status },
      headers: request.headers,
    });

    return ok(request, { meeting: updated });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission(request, "meetings.manage", { route: "/api/office/meetings/:id" });
    if (guard instanceof Response) return guard;
    if (!hasPgConnection()) return fail(request, "pg_missing", "Postgres не настроен", 503);
    const { id } = await params;
    const existing = await getMeetingById(id);
    if (!existing) return fail(request, "not_found", "Meeting not found", 404);
    await sql`delete from meetings where id = ${id}`;
    await logAdminAction({
      action: "meetings.delete",
      entity: "meetings",
      entityId: id,
      before: { title: existing.title },
      headers: request.headers,
    });
    return ok(request, { ok: true });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
