export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissionsGuard";
import { listTasks, type TaskStatus } from "@/lib/tasks.pg";

const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
const isTaskStatus = (value: string | null): value is TaskStatus =>
  value === "todo" ||
  value === "in_progress" ||
  value === "blocked" ||
  value === "done" ||
  value === "cancelled";

export async function GET(request: Request) {
  const guard = await requirePermission(request, "tasks.view", { route: "/api/office/tasks/export.csv" });
  if (guard instanceof Response) return guard;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const limit = Math.min(500, Number(searchParams.get("limit") ?? 200));
  const tasks = await listTasks({ status: isTaskStatus(status) ? status : null, limit, offset: 0 });

  const lines = ["id,title,status,priority,due_at"];
  tasks.forEach((task) => {
    lines.push([task.id, escapeCsv(task.title), task.status, task.priority, task.dueAt ?? ""].join(","));
  });

  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"tasks.csv\"",
    },
  });
}
