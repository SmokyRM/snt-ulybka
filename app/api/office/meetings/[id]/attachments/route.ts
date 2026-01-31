import { ok, unauthorized, forbidden, badRequest, fail, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { canManageMeetingMinutes } from "@/lib/meetingMinutesAccess";
import {
  addMinutesAttachment,
  getMeetingMinutesById,
  removeMinutesAttachment,
} from "@/lib/meetingMinutes";
import { logAdminAction } from "@/lib/audit";
import { uploadDocument } from "@/lib/uploadDocument";

export async function POST(
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

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return badRequest(request, "file is required");
    }

    const uploaded = await uploadDocument(file);
    const attachment = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      name: uploaded.filename,
      url: uploaded.url,
      mime: uploaded.mime,
      size: uploaded.size,
    };

    const updated = await addMinutesAttachment(id, attachment, user.id ?? null);
    if (!updated) return serverError(request, "Failed to attach");

    await logAdminAction({
      action: "meeting_minutes_attachment_added",
      entity: "meeting_minutes",
      entityId: id,
      after: { attachmentId: attachment.id, name: attachment.name },
      headers: request.headers,
    });

    return ok(request, { attachment, meeting: updated });
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
    const body = await request.json().catch(() => null);
    if (!body || typeof body.attachmentId !== "string") {
      return badRequest(request, "attachmentId is required");
    }

    const updated = await removeMinutesAttachment(id, body.attachmentId, user.id ?? null);
    if (!updated) return fail(request, "not_found", "Attachment not found", 404);

    await logAdminAction({
      action: "meeting_minutes_attachment_removed",
      entity: "meeting_minutes",
      entityId: id,
      after: { attachmentId: body.attachmentId },
      headers: request.headers,
    });

    return ok(request, { meeting: updated });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
