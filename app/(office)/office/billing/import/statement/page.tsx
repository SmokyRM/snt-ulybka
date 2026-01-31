import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import OfficeErrorState from "../../../_components/OfficeErrorState";
import StatementImportClient from "./StatementImportClient";

export default async function OfficeBillingStatementImportPage() {
  const user = await getEffectiveSessionUser();
  if (!user) {
    redirect("/staff-login?next=/office/billing/import/statement");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    redirect("/forbidden?reason=office.only&next=/office/billing/import/statement");
  }

  if (!hasPermission(role, "billing.import_statement")) {
    return <OfficeErrorState message="Нет доступа к импорту выписки (403)." />;
  }

  return <StatementImportClient />;
}
