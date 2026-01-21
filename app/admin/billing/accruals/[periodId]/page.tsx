import { redirect, notFound } from "next/navigation";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { isAdminRole, isOfficeRole } from "@/lib/rbac";
import { findUnifiedBillingPeriodById } from "@/lib/mockDb";
import AccrualsPeriodClient from "./AccrualsPeriodClient";

export default async function AccrualsPeriodPage({
  params,
}: {
  params: Promise<{ periodId: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/staff-login?next=/admin/billing/accruals");
  if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
    redirect("/forbidden?reason=billing&next=/admin/billing/accruals");
  }

  const { periodId } = await params;
  const period = findUnifiedBillingPeriodById(periodId);
  if (!period) notFound();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">
          {period.title ?? `${period.from} — ${period.to}`}
        </h1>
        <p className="text-sm text-zinc-600">
          Предпросмотр и применение генерации начислений по участкам. Экспорт CSV.
        </p>
      </div>
      <AccrualsPeriodClient periodId={periodId} />
    </div>
  );
}
