import { ok, unauthorized, forbidden, badRequest, fail, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { canManageMeetingMinutes } from "@/lib/meetingMinutesAccess";
import { deleteMeetingMinutes, getMeetingMinutesById, updateMeetingMinutes } from "@/lib/meetingMinutes";
import { logAdminAction } from "@/lib/audit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getEffectiveSessionUser();
    if (!user) return unauthorized(request);
    if (!canManageMeetingMinutes(user.role)) return forbidden(request);

    const { id } = await params;
    const meeting = await getMeetingMinutesById(id);
    if (!meeting) return fail(request, "not_found", "Meeting not found", 404);

    return ok(request, { meeting });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getEffectiveSessionUser();
    if (!user) return unauthorized(request);
    if (!canManageMeetingMinutes(user.role)) return forbidden(request);

    const { id } = await params;
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return badRequest(request, "Invalid payload");

    const existing = await getMeetingMinutesById(id);
    if (!existing) return fail(request, "not_found", "Meeting not found", 404);

    const nextStatus: "draft" | "published" = body.status === "published" ? "published" : "draft";
    const patch = {
      title: typeof body.title === "string" ? body.title.trim() : existing.title,
      date: typeof body.date === "string" ? body.date.trim() : existing.date,
      location: typeof body.location === "string" ? body.location.trim() : existing.location ?? null,
      attendees: typeof body.attendees === "string" ? body.attendees.trim() : existing.attendees ?? null,
      agenda: Array.isArray(body.agenda) ? body.agenda : existing.agenda,
      votes: Array.isArray(body.votes) ? body.votes : existing.votes,
      decisions: Array.isArray(body.decisions) ? body.decisions : existing.decisions,
      summary: typeof body.summary === "string" ? body.summary.trim() : existing.summary ?? null,
      attachments: Array.isArray(body.attachments) ? body.attachments : existing.attachments,
      status: nextStatus,
      updatedByUserId: user.id ?? null,
    };

    const updated = await updateMeetingMinutes(id, patch);
    if (!updated) return serverError(request, "Failed to update");

    await logAdminAction({
      action: "meeting_minutes_updated",
      entity: "meeting_minutes",
      entityId: id,
      before: { title: existing.title, date: existing.date, status: existing.status },
      after: { title: updated.title, date: updated.date, status: updated.status },
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
    const user = await getEffectiveSessionUser();
    if (!user) return unauthorized(request);
    if (!canManageMeetingMinutes(user.role)) return forbidden(request);

    const { id } = await params;
    const existing = await getMeetingMinutesById(id);
    if (!existing) return fail(request, "not_found", "Meeting not found", 404);

    const removed = await deleteMeetingMinutes(id);
    if (!removed) return serverError(request, "Failed to delete");

    await logAdminAction({
      action: "meeting_minutes_deleted",
      entity: "meeting_minutes",
      entityId: id,
      before: { title: existing.title, date: existing.date },
      headers: request.headers,
    });

    return ok(request, { ok: true });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
