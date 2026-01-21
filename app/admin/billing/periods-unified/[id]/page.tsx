import { redirect } from "next/navigation";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import PeriodDetailClient from "./PeriodDetailClient";
import { findUnifiedBillingPeriodById } from "@/lib/mockDb";

export default async function PeriodDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/staff-login?next=/admin/billing/periods-unified");
  }
  if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
    redirect("/forbidden?reason=finance.access&next=/admin/billing/periods-unified");
  }

  const { id } = await params;
  const period = findUnifiedBillingPeriodById(id);
  if (!period) {
    redirect("/admin/billing/periods-unified");
  }

  return <PeriodDetailClient periodId={id} initialPeriod={period} />;
}
