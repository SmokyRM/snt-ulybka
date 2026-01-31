import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { assertCan, isStaffOrAdmin } from "@/lib/rbac";
import type { Role } from "@/lib/permissions";
import { hasPermission as hasActionPermission } from "@/lib/permissions";
import ImportPaymentsClient from "./ImportPaymentsClient";
import OfficeErrorState from "../../_components/OfficeErrorState";

export default async function OfficeBillingImportPage() {
  const user = await getEffectiveSessionUser();
  if (!user) {
    redirect("/staff-login?next=/office/billing/import");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    redirect("/forbidden?reason=office.only&next=/office");
  }
  try {
    assertCan(role, "finance.read", "finance");
  } catch {
    redirect("/forbidden?reason=office.only&next=/office");
  }

  const canImport = hasActionPermission(role, "billing.import");
  if (!canImport) {
    return <OfficeErrorState message="Нет доступа к импорту платежей (403)." />;
  }

  return <ImportPaymentsClient />;
}
