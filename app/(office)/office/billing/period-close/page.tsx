import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { hasPermission } from "@/lib/permissions";
import PeriodCloseClient from "./PeriodCloseClient";

export default async function PeriodClosePage({ searchParams }: { searchParams: { period?: string } }) {
  const user = await getEffectiveSessionUser();
  if (!user) {
    redirect("/staff/login?next=/office/billing/period-close");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    redirect("/forbidden?reason=office.only&next=/office");
  }
  if (!hasPermission(role, "billing.generate")) {
    redirect("/forbidden?reason=office.only&next=/office");
  }

  const period = typeof searchParams?.period === "string" ? searchParams.period : new Date().toISOString().slice(0, 7);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Закрытие периода</h1>
        <p className="text-sm text-zinc-600">Фиксация агрегатов и контроль изменений после закрытия</p>
      </div>
      <PeriodCloseClient initialPeriod={period} />
    </div>
  );
}
