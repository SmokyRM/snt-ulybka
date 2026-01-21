import { redirect } from "next/navigation";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import PeriodsClient from "./PeriodsClient";
import { listPeriods } from "@/lib/billing/core";

export default async function BillingPeriodsPage() {
  const user = await getSessionUser();
  if (!hasFinanceAccess(user)) {
    redirect("/staff-login?next=/admin/billing/periods");
  }

  const periods = listPeriods();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">Периоды начислений</h1>
        <p className="text-sm text-zinc-600">
          Управление периодами для начислений. Период определяется годом и месяцем (YYYY-MM).
        </p>
      </div>
      <PeriodsClient initialPeriods={periods} />
    </div>
  );
}