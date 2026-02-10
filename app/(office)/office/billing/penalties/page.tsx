import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { assertCan, isStaffOrAdmin } from "@/lib/rbac";
import type { Role } from "@/lib/permissions";
import { hasPermission as hasActionPermission } from "@/lib/permissions";
import PenaltiesClient from "./PenaltiesClient";
import OfficeErrorState from "../../_components/OfficeErrorState";

export default async function OfficePenaltiesPage() {
  const user = await getEffectiveSessionUser();
  if (!user) {
    redirect("/staff-login?next=/office/billing/penalties");
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

  const canPenalty =
    hasActionPermission(role, "billing.penalty.apply") ||
    hasActionPermission(role, "billing.penalty.recalc") ||
    hasActionPermission(role, "billing.penalty.freeze") ||
    hasActionPermission(role, "billing.penalty.void");
  if (!canPenalty) {
    return <OfficeErrorState message="Нет доступа к управлению пенями (403)." />;
  }

  return (
    <div className="space-y-4" data-testid="office-penalties-root">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Пени (v2)</h1>
        <p className="text-sm text-zinc-600">Расчёт по правилам и управление исключениями.</p>
      </div>
      <PenaltiesClient />
    </div>
  );
}
