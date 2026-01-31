import { ok, unauthorized, forbidden, badRequest, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { canManageMeetingMinutes } from "@/lib/meetingMinutesAccess";
import { createMeetingMinutes, listMeetingMinutes } from "@/lib/meetingMinutes";
import { logAdminAction } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const user = await getEffectiveSessionUser();
    if (!user) return unauthorized(request);
    if (!canManageMeetingMinutes(user.role)) return forbidden(request);

    const meetings = await listMeetingMinutes();
    return ok(request, { meetings });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getEffectiveSessionUser();
    if (!user) return unauthorized(request);
    if (!canManageMeetingMinutes(user.role)) return forbidden(request);

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return badRequest(request, "Invalid payload");

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const date = typeof body.date === "string" ? body.date.trim() : "";
    if (!title || !date) return badRequest(request, "title and date are required");

    const meeting = await createMeetingMinutes({
      title,
      date,
      location: typeof body.location === "string" ? body.location.trim() : null,
      attendees: typeof body.attendees === "string" ? body.attendees.trim() : null,
      agenda: Array.isArray(body.agenda) ? body.agenda : [],
      votes: Array.isArray(body.votes) ? body.votes : [],
      decisions: Array.isArray(body.decisions) ? body.decisions : [],
      summary: typeof body.summary === "string" ? body.summary.trim() : null,
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
      status: body.status === "published" ? "published" : "draft",
      createdByUserId: user.id ?? null,
    });

    await logAdminAction({
      action: "meeting_minutes_created",
      entity: "meeting_minutes",
      entityId: meeting.id,
      after: { title: meeting.title, date: meeting.date, status: meeting.status },
      headers: request.headers,
    });

    return ok(request, { meeting }, { status: 201 });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
