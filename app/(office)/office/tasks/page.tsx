import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { isStaffOrAdmin } from "@/lib/rbac";
import type { Role } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";
import OfficeErrorState from "../_components/OfficeErrorState";
import TasksClient from "./TasksClient";

export default async function OfficeTasksPage() {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff-login?next=/office/tasks");
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role) || !hasPermission(role, "tasks.view")) {
    return <OfficeErrorState message="Нет доступа к поручениям (403)." />;
  }

  return (
    <div className="space-y-4" data-testid="office-tasks-root">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Поручения</h1>
        <p className="text-sm text-zinc-600">Контроль исполнения задач правления.</p>
      </div>
      <TasksClient />
    </div>
  );
}
