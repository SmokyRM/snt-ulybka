export const runtime = "nodejs";

import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { listTasks, createTask, type TaskStatus } from "@/lib/tasks.pg";
import { logAdminAction } from "@/lib/audit";

const isTaskStatus = (value: string | null): value is TaskStatus =>
  value === "todo" ||
  value === "in_progress" ||
  value === "blocked" ||
  value === "done" ||
  value === "cancelled";

export async function GET(request: Request) {
  const guard = await requirePermission(request, "tasks.view", { route: "/api/office/tasks" });
  if (guard instanceof Response) return guard;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const assignedTo = searchParams.get("assignedTo");
    const meetingId = searchParams.get("meetingId");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");
    const tasks = await listTasks({
      status: isTaskStatus(status) ? status : null,
      assignedTo: assignedTo || null,
      meetingId: meetingId || null,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
    return ok(request, { tasks });
  } catch (error) {
    return serverError(request, "Ошибка загрузки поручений", error);
  }
}

export async function POST(request: Request) {
  const guard = await requirePermission(request, "tasks.manage", { route: "/api/office/tasks" });
  if (guard instanceof Response) return guard;

  try {
    const body = await request.json().catch(() => ({}));
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : null;
    if (!title) return fail(request, "validation_error", "title обязателен", 400);

    const task = await createTask({
      title,
      description,
      status: body.status,
      priority: body.priority,
      dueAt: typeof body.dueAt === "string" ? body.dueAt : null,
      createdBy: guard.session.id ?? null,
      assignedTo: typeof body.assignedTo === "string" ? body.assignedTo : null,
      meetingId: typeof body.meetingId === "string" ? body.meetingId : null,
      agendaItemId: typeof body.agendaItemId === "string" ? body.agendaItemId : null,
    });

    await logAdminAction({
      action: "tasks.create",
      entity: "board_tasks",
      entityId: task?.id ?? null,
      meta: { title },
      headers: request.headers,
    });

    return ok(request, { task }, { status: 201 });
  } catch (error) {
    return serverError(request, "Ошибка создания поручения", error);
  }
}
