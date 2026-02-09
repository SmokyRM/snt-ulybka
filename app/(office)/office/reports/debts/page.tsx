import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { assertCan, isStaffOrAdmin } from "@/lib/rbac";
import type { Role } from "@/lib/permissions";
import { hasPermission as hasActionPermission } from "@/lib/permissions";
import DebtsReportClient from "./DebtsReportClient";
import OfficeErrorState from "../../_components/OfficeErrorState";

export default async function OfficeDebtsReportPage() {
  const user = await getEffectiveSessionUser();
  if (!user) {
    redirect("/staff-login?next=/office/reports/debts");
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

  const canView = hasActionPermission(role, "billing.view_debtors");
  if (!canView) {
    return <OfficeErrorState message="Нет доступа к отчёту по задолженности (403)." />;
  }

  return (
    <div className="space-y-4" data-testid="office-debts-report-root">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Отчёт по задолженности</h1>
        <p className="text-sm text-zinc-600">Топ должников и динамика по периодам.</p>
      </div>
      <DebtsReportClient />
    </div>
  );
}
