import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { isStaffOrAdmin } from "@/lib/rbac";
import type { Role } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";
import OfficeErrorState from "../../_components/OfficeErrorState";
import TaskDetailClient from "./TaskDetailClient";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function OfficeTaskDetailPage({ params }: Props) {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff-login?next=/office/tasks");
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role) || !hasPermission(role, "tasks.view")) {
    return <OfficeErrorState message="Нет доступа к поручению (403)." />;
  }
  const { id } = await params;
  return (
    <div className="space-y-4">
      <TaskDetailClient taskId={id} />
    </div>
  );
}
