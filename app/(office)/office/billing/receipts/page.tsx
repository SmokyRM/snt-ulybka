import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { assertCan, isStaffOrAdmin } from "@/lib/rbac";
import type { Role } from "@/lib/permissions";
import ReceiptsClient from "./ReceiptsClient";

export default async function OfficeReceiptsPage() {
  const user = await getEffectiveSessionUser();
  if (!user) {
    redirect("/staff-login?next=/office/billing/receipts");
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
    <div className="space-y-4" data-testid="office-billing-receipts-root">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Квитанции</h1>
        <p className="text-sm text-zinc-600">Формирование и печать квитанций на оплату.</p>
      </div>
      <ReceiptsClient />
    </div>
  );
}
