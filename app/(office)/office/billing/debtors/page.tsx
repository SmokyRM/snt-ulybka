import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import OfficeErrorState from "../../_components/OfficeErrorState";
import DebtorsClient from "./DebtorsClient";

export default async function OfficeBillingDebtorsPage() {
  const user = await getEffectiveSessionUser();
  if (!user) {
    redirect("/staff-login?next=/office/billing/debtors");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    redirect("/forbidden?reason=office.only&next=/office/billing/debtors");
  }

  if (!hasPermission(role, "billing.view_debtors")) {
    return <OfficeErrorState message="Нет доступа к должникам (403)." />;
  }

  const canGenerateCampaign =
    hasPermission(role, "notifications.generate_campaign") || hasPermission(role, "notifications.send");

  return <DebtorsClient canGenerateCampaign={canGenerateCampaign} />;
}
