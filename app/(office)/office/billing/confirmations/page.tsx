import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { assertCan, isStaffOrAdmin } from "@/lib/rbac";
import type { Role } from "@/lib/permissions";
import ConfirmationsClient from "./ConfirmationsClient";

export default async function OfficeConfirmationsPage() {
  const user = await getEffectiveSessionUser();
  if (!user) {
    redirect("/staff-login?next=/office/billing/confirmations");
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

  return (
    <div className="space-y-4" data-testid="office-billing-confirmations-root">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Подтверждения оплаты</h1>
        <p className="text-sm text-zinc-600">Рассмотрение подтверждений оплаты от жителей.</p>
      </div>
      <ConfirmationsClient />
    </div>
  );
}
