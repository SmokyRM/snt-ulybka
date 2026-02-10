import { sql } from "@/db/client";

export type TaskStatus = "todo" | "in_progress" | "blocked" | "done" | "cancelled";
export type TaskPriority = "low" | "normal" | "high";

export type BoardTask = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string | null;
  createdAt: string;
  createdBy: string | null;
  assignedTo: string | null;
  meetingId: string | null;
  agendaItemId: string | null;
  closedAt: string | null;
  closedBy: string | null;
  meta: Record<string, unknown>;
};

export type TaskUpdate = {
  id: string;
  taskId: string;
  authorId: string | null;
  authorRole: string | null;
  message: string;
  statusTo: TaskStatus | null;
  createdAt: string;
};

const mapTask = (row: {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_at: string | null;
  created_at: string;
  created_by: string | null;
  assigned_to: string | null;
  meeting_id: string | null;
  agenda_item_id: string | null;
  closed_at: string | null;
  closed_by: string | null;
  meta: Record<string, unknown>;
}): BoardTask => ({
  id: row.id,
  title: row.title,
  description: row.description,
  status: row.status,
  priority: row.priority,
  dueAt: row.due_at,
  createdAt: row.created_at,
  createdBy: row.created_by,
  assignedTo: row.assigned_to,
  meetingId: row.meeting_id,
  agendaItemId: row.agenda_item_id,
  closedAt: row.closed_at,
  closedBy: row.closed_by,
  meta: row.meta ?? {},
});

const mapUpdate = (row: {
  id: string;
  task_id: string;
  author_id: string | null;
  author_role: string | null;
  message: string;
  status_to: TaskStatus | null;
  created_at: string;
}): TaskUpdate => ({
  id: row.id,
  taskId: row.task_id,
  authorId: row.author_id,
  authorRole: row.author_role,
  message: row.message,
  statusTo: row.status_to,
  createdAt: row.created_at,
});

export async function listTasks(params?: {
  status?: TaskStatus | null;
  assignedTo?: string | null;
  meetingId?: string | null;
  limit?: number;
  offset?: number;
}) {
  const conditions = [] as ReturnType<typeof sql>[];
  if (params?.status) conditions.push(sql`status = ${params.status}`);
  if (params?.assignedTo) conditions.push(sql`assigned_to = ${params.assignedTo}`);
  if (params?.meetingId) conditions.push(sql`meeting_id = ${params.meetingId}`);
  const where = conditions.length ? sql`where ${sql.join(conditions, sql` and `)}` : sql``;
  const limit = Math.min(100, Math.max(10, params?.limit ?? 20));
  const offset = Math.max(0, params?.offset ?? 0);
  const rows = await sql<
    Array<{
      id: string;
      title: string;
      description: string | null;
      status: TaskStatus;
      priority: TaskPriority;
      due_at: string | null;
      created_at: string;
      created_by: string | null;
      assigned_to: string | null;
      meeting_id: string | null;
      agenda_item_id: string | null;
      closed_at: string | null;
      closed_by: string | null;
      meta: Record<string, unknown>;
    }>
  >`
    select
      id,
      title,
      description,
      status,
      priority,
      due_at::text as due_at,
      created_at::text as created_at,
      created_by,
      assigned_to,
      meeting_id,
      agenda_item_id,
      closed_at::text as closed_at,
      closed_by,
      meta
    from board_tasks
    ${where}
    order by created_at desc
    limit ${limit}
    offset ${offset}
  `;
  return rows.map(mapTask);
}

export async function getTask(id: string): Promise<BoardTask | null> {
  const rows = await sql<
    Array<{
      id: string;
      title: string;
      description: string | null;
      status: TaskStatus;
      priority: TaskPriority;
      due_at: string | null;
      created_at: string;
      created_by: string | null;
      assigned_to: string | null;
      meeting_id: string | null;
      agenda_item_id: string | null;
      closed_at: string | null;
      closed_by: string | null;
      meta: Record<string, unknown>;
    }>
  >`
    select
      id,
      title,
      description,
      status,
      priority,
      due_at::text as due_at,
      created_at::text as created_at,
      created_by,
      assigned_to,
      meeting_id,
      agenda_item_id,
      closed_at::text as closed_at,
      closed_by,
      meta
    from board_tasks
    where id = ${id}
    limit 1
  `;
  return rows[0] ? mapTask(rows[0]) : null;
}

export async function createTask(input: {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueAt?: string | null;
  createdBy: string | null;
  assignedTo?: string | null;
  meetingId?: string | null;
  agendaItemId?: string | null;
}) {
  const rows = await sql<
    Array<{
      id: string;
      title: string;
      description: string | null;
      status: TaskStatus;
      priority: TaskPriority;
      due_at: string | null;
      created_at: string;
      created_by: string | null;
      assigned_to: string | null;
      meeting_id: string | null;
      agenda_item_id: string | null;
      closed_at: string | null;
      closed_by: string | null;
      meta: Record<string, unknown>;
    }>
  >`
    insert into board_tasks (title, description, status, priority, due_at, created_by, assigned_to, meeting_id, agenda_item_id)
    values (${input.title}, ${input.description ?? null}, ${input.status ?? "todo"}, ${input.priority ?? "normal"},
            ${input.dueAt ?? null}, ${input.createdBy}, ${input.assignedTo ?? null},
            ${input.meetingId ?? null}, ${input.agendaItemId ?? null})
    returning
      id,
      title,
      description,
      status,
      priority,
      due_at::text as due_at,
      created_at::text as created_at,
      created_by,
      assigned_to,
      meeting_id,
      agenda_item_id,
      closed_at::text as closed_at,
      closed_by,
      meta
  `;
  return rows[0] ? mapTask(rows[0]) : null;
}

export async function updateTask(
  id: string,
  patch: {
    title?: string | null;
    description?: string | null;
    status?: TaskStatus | null;
    priority?: TaskPriority | null;
    dueAt?: string | null;
    assignedTo?: string | null;
    closedBy?: string | null;
  },
) {
  const rows = await sql<
    Array<{
      id: string;
      title: string;
      description: string | null;
      status: TaskStatus;
      priority: TaskPriority;
      due_at: string | null;
      created_at: string;
      created_by: string | null;
      assigned_to: string | null;
      meeting_id: string | null;
      agenda_item_id: string | null;
      closed_at: string | null;
      closed_by: string | null;
      meta: Record<string, unknown>;
    }>
  >`
    update board_tasks
    set title = coalesce(${patch.title ?? null}, title),
        description = coalesce(${patch.description ?? null}, description),
        status = coalesce(${patch.status ?? null}, status),
        priority = coalesce(${patch.priority ?? null}, priority),
        due_at = ${patch.dueAt ?? null},
        assigned_to = ${patch.assignedTo ?? null},
        closed_at = case when ${patch.status ?? null} = 'done' then now() else closed_at end,
        closed_by = case when ${patch.status ?? null} = 'done' then ${patch.closedBy ?? null} else closed_by end
    where id = ${id}
    returning
      id,
      title,
      description,
      status,
      priority,
      due_at::text as due_at,
      created_at::text as created_at,
      created_by,
      assigned_to,
      meeting_id,
      agenda_item_id,
      closed_at::text as closed_at,
      closed_by,
      meta
  `;
  return rows[0] ? mapTask(rows[0]) : null;
}

export async function listTaskUpdates(taskId: string) {
  const rows = await sql<
    Array<{
      id: string;
      task_id: string;
      author_id: string | null;
      author_role: string | null;
      message: string;
      status_to: TaskStatus | null;
      created_at: string;
    }>
  >`
    select
      id,
      task_id,
      author_id,
      author_role,
      message,
      status_to,
      created_at::text as created_at
    from board_task_updates
    where task_id = ${taskId}
    order by created_at desc
  `;
  return rows.map(mapUpdate);
}

export async function addTaskUpdate(input: {
  taskId: string;
  authorId: string | null;
  authorRole: string | null;
  message: string;
  statusTo?: TaskStatus | null;
}) {
  const rows = await sql<
    Array<{
      id: string;
      task_id: string;
      author_id: string | null;
      author_role: string | null;
      message: string;
      status_to: TaskStatus | null;
      created_at: string;
    }>
  >`
    insert into board_task_updates (task_id, author_id, author_role, message, status_to)
    values (${input.taskId}, ${input.authorId}, ${input.authorRole}, ${input.message}, ${input.statusTo ?? null})
    returning
      id,
      task_id,
      author_id,
      author_role,
      message,
      status_to,
      created_at::text as created_at
  `;
  return rows[0] ? mapUpdate(rows[0]) : null;
}
