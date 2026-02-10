export const runtime = "nodejs";

import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { addTaskUpdate, getTask } from "@/lib/tasks.pg";
import { logAdminAction } from "@/lib/audit";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission(request, "tasks.manage", { route: "/api/office/tasks/:id/comment" });
  if (guard instanceof Response) return guard;

  try {
    const { id } = await params;
    const task = await getTask(id);
    if (!task) return fail(request, "not_found", "Task not found", 404);
    const body = await request.json().catch(() => ({}));
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) return fail(request, "validation_error", "message обязателен", 400);

    const update = await addTaskUpdate({
      taskId: id,
      authorId: guard.session.id ?? null,
      authorRole: guard.role,
      message,
      statusTo: typeof body.statusTo === "string" ? body.statusTo : null,
    });

    await logAdminAction({
      action: "tasks.comment",
      entity: "board_tasks",
      entityId: id,
      meta: { updateId: update?.id ?? null },
      headers: request.headers,
    });

    return ok(request, { update });
  } catch (error) {
    return serverError(request, "Ошибка добавления комментария", error);
  }
}
