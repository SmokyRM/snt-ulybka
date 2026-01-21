import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { assertCan, isStaffOrAdmin } from "@/lib/rbac";
import type { Role } from "@/lib/permissions";
import { listExports } from "@/server/services/finance";
import AppLink from "@/components/AppLink";

export default async function OfficeFinanceExportsPage() {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff/login?next=/office/finance/exports");
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    redirect("/forbidden?reason=office.only&next=/office");
  }

  try {
    assertCan(role, "finance.read", "finance");
  } catch {
    redirect("/forbidden?reason=office.only&next=/office");
  }

  let exports;
  try {
    exports = await listExports();
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      redirect("/staff/login?next=/office/finance/exports");
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      redirect("/forbidden?reason=office.only&next=/office");
    }
    throw error;
  }

  return (
    <div className="space-y-4" data-testid="finance-export">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Выгрузки</h1>
          <p className="text-sm text-zinc-600">История экспортов финансовых данных</p>
        </div>
        <AppLink
          href="/office/finance"
          className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-[#5E704F]"
        >
          Назад
        </AppLink>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {exports.length === 0 ? (
          <div className="px-4 py-6 text-sm text-zinc-600">Пока нет выгрузок.</div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {exports.map((exp) => (
              <div key={exp.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-zinc-900">{exp.filename}</span>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                      {exp.type === "payments" ? "Платежи" : exp.type === "debts" ? "Долги" : "Сводка"}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500">
                    Создано: {new Date(exp.createdAt).toLocaleString("ru-RU")} • Строк: {exp.rowCount}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
