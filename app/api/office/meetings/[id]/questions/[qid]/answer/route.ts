export const runtime = "nodejs";

import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { answerQuestion, hasPgConnection } from "@/lib/meetings.pg";
import { logAdminAction } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; qid: string }> }
) {
  const guard = await requirePermission(request, "meetings.manage", {
    route: "/api/office/meetings/:id/questions/:qid/answer",
  });
  if (guard instanceof Response) return guard;
  if (!hasPgConnection()) return fail(request, "pg_missing", "Postgres не настроен", 503);

  try {
    const { id, qid } = await params;
    const body = await request.json().catch(() => ({}));
    const status = body.status === "hidden" ? "hidden" : "answered";
    const answer = typeof body.answer === "string" ? body.answer.trim() : null;
    const question = await answerQuestion({
      id: qid,
      status,
      answer,
      answeredBy: guard.session.id ?? null,
    });
    if (!question) return fail(request, "not_found", "Question not found", 404);

    await logAdminAction({
      action: "meetings.question.answer",
      entity: "meetings",
      entityId: id,
      meta: { questionId: qid, status },
      headers: request.headers,
    });

    return ok(request, { question });
  } catch (error) {
    return serverError(request, "Ошибка ответа на вопрос", error);
  }
}
