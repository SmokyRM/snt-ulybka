import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { assertCan, isStaffOrAdmin } from "@/lib/rbac";
import type { Role } from "@/lib/permissions";
import { hasPermission as hasActionPermission } from "@/lib/permissions";
import AppLink from "@/components/AppLink";
import PenaltyClient from "./PenaltyClient";
import OfficeErrorState from "../../_components/OfficeErrorState";

export default async function OfficePenaltyPage() {
  const user = await getEffectiveSessionUser();
  if (!user) {
    redirect("/staff-login?next=/office/billing/penalty");
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

  const canExport = hasActionPermission(role, "billing.export");
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-4" data-testid="office-penalty-root">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Пени</h1>
          <p className="text-sm text-zinc-600">Расчёт, пересчёт и управление начислениями пени.</p>
        </div>
        {canExport && (
          <AppLink
            href={`/api/office/billing/reports/penalty.csv?asOf=${today}&rate=0.1`}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-zinc-300"
            data-testid="office-penalty-export"
          >
            Экспорт CSV
          </AppLink>
        )}
      </div>
      <PenaltyClient />
    </div>
  );
}
