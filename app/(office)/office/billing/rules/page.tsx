import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { assertCan, isStaffOrAdmin } from "@/lib/rbac";
import type { Role } from "@/lib/permissions";
import { hasPermission as hasActionPermission } from "@/lib/permissions";
import RulesClient from "./RulesClient";
import OfficeErrorState from "../../_components/OfficeErrorState";

export default async function OfficeBillingRulesPage() {
  const user = await getEffectiveSessionUser();
  if (!user) {
    redirect("/staff-login?next=/office/billing/rules");
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

  const canGenerate = hasActionPermission(role, "billing.generate");
  if (!canGenerate) {
    return <OfficeErrorState message="Нет доступа к управлению правилами начислений (403)." />;
  }

  return (
    <div className="space-y-4" data-testid="office-billing-rules-root">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Правила начислений</h1>
        <p className="text-sm text-zinc-600">Управление правилами и периодами начислений.</p>
      </div>
      <RulesClient />
    </div>
  );
}
