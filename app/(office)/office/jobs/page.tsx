import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { hasPermission } from "@/lib/permissions";
import OfficeJobsClient from "./OfficeJobsClient";

export default async function OfficeJobsPage() {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff-login?next=/office/jobs");
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    redirect("/forbidden?reason=office.only&next=/office");
  }
  const canView =
    hasPermission(role, "billing.receipts") ||
    hasPermission(role, "billing.import") ||
    hasPermission(role, "billing.import.excel");
  if (!canView) {
    redirect("/forbidden?reason=office.only&next=/office");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Задания</h1>
        <p className="text-sm text-zinc-600">История фоновых операций.</p>
      </div>
      <OfficeJobsClient />
    </div>
  );
}
