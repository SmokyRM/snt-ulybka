export const runtime = "nodejs";

import { ok, unauthorized, forbidden, fail, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { isResidentRole } from "@/lib/rbac";
import { createQuestion, getMeetingById, hasPgConnection } from "@/lib/meetings.pg";
import { getUserPlots } from "@/lib/plots";
import { logAdminAction } from "@/lib/audit";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getEffectiveSessionUser().catch(() => null);
  if (!session) return unauthorized(request);
  if (!isResidentRole(session.role)) return forbidden(request);

  try {
    if (!hasPgConnection()) return fail(request, "pg_missing", "Postgres не настроен", 503);
    const { id } = await params;
    const meeting = await getMeetingById(id);
    if (!meeting || meeting.status !== "published") {
      return fail(request, "not_found", "Meeting not found", 404);
    }
    const body = await request.json().catch(() => ({}));
    const questionText = typeof body.question === "string" ? body.question.trim() : "";
    const plotId = typeof body.plotId === "string" ? body.plotId : null;
    if (!questionText) return fail(request, "validation_error", "question обязателен", 400);
    if (plotId) {
      const plots = await getUserPlots(session.id);
      const owned = plots.some((plot) => plot.plotId === plotId);
      if (!owned) return fail(request, "not_found", "Plot not found", 404);
    }
    const question = await createQuestion({
      meetingId: id,
      userId: session.id ?? "",
      plotId,
      question: questionText,
    });
    await logAdminAction({
      action: "meetings.question.create",
      entity: "meetings",
      entityId: id,
      meta: { questionId: question?.id ?? null },
      headers: request.headers,
    });
    return ok(request, { question });
  } catch (error) {
    return serverError(request, "Ошибка отправки вопроса", error);
  }
}
