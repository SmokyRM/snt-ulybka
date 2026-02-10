export const runtime = "nodejs";

import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { getTask, updateTask, listTaskUpdates } from "@/lib/tasks.pg";
import { logAdminAction } from "@/lib/audit";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission(request, "tasks.view", { route: "/api/office/tasks/:id" });
  if (guard instanceof Response) return guard;

  try {
    const { id } = await params;
    const task = await getTask(id);
    if (!task) return fail(request, "not_found", "Task not found", 404);
    const updates = await listTaskUpdates(id);
    return ok(request, { task, updates });
  } catch (error) {
    return serverError(request, "Ошибка загрузки поручения", error);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission(request, "tasks.manage", { route: "/api/office/tasks/:id" });
  if (guard instanceof Response) return guard;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const task = await updateTask(id, {
      title: typeof body.title === "string" ? body.title.trim() : null,
      description: typeof body.description === "string" ? body.description.trim() : null,
      status: typeof body.status === "string" ? body.status : null,
      priority: typeof body.priority === "string" ? body.priority : null,
      dueAt: typeof body.dueAt === "string" ? body.dueAt : null,
      assignedTo: typeof body.assignedTo === "string" ? body.assignedTo : null,
      closedBy: guard.session.id ?? null,
    });
    if (!task) return fail(request, "not_found", "Task not found", 404);

    await logAdminAction({
      action: "tasks.update",
      entity: "board_tasks",
      entityId: id,
      meta: { status: task.status },
      headers: request.headers,
    });

    return ok(request, { task });
  } catch (error) {
    return serverError(request, "Ошибка обновления поручения", error);
  }
}
