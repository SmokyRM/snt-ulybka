import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { hasPermission } from "@/lib/permissions";
import DashboardSummaryClient from "./DashboardSummaryClient";

export default async function OfficeDashboardPage() {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff-login?next=/office/dashboard");
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    redirect("/forbidden?reason=office.only&next=/office");
  }
  if (!(role === "admin" || role === "chairman" || role === "accountant" || hasPermission(role, "billing.export"))) {
    redirect("/forbidden?reason=office.only&next=/office");
  }

  const period = new Date().toISOString().slice(0, 7);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Дашборд председателя</h1>
        <p className="text-sm text-zinc-600">Ключевые показатели по финансам и обращениям.</p>
      </div>
      <DashboardSummaryClient period={period} />
    </div>
  );
}
