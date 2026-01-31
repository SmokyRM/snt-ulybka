import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { assertCan, isStaffOrAdmin } from "@/lib/rbac";
import type { Role } from "@/lib/permissions";
import { hasPermission as hasActionPermission } from "@/lib/permissions";
import ImportPaymentsExcelClient from "./ImportPaymentsExcelClient";
import OfficeErrorState from "../../_components/OfficeErrorState";

export default async function OfficeBillingImportExcelPage() {
  const user = await getEffectiveSessionUser();
  if (!user) {
    redirect("/staff-login?next=/office/billing/import-excel");
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

  const canImport = hasActionPermission(role, "billing.import.excel");
  if (!canImport) {
    return <OfficeErrorState message="Нет доступа к импорту XLSX (403)." />;
  }

  return <ImportPaymentsExcelClient />;
}
