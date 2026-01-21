import { redirect } from "next/navigation";
import AppLink from "@/components/AppLink";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { hasPermission, isOfficeRole } from "@/lib/rbac";
import { listAppeals, type AppealStatus } from "@/lib/office/appeals.server";
import { getAppealSlaContainerClass, getDueDateTextClass } from "@/lib/appealsSlaStyling";

const columns: { key: AppealStatus; title: string; color: string }[] = [
  { key: "new", title: "Новые", color: "border-blue-200 bg-blue-50" },
  { key: "in_progress", title: "В работе", color: "border-amber-200 bg-amber-50" },
  { key: "needs_info", title: "Требует уточнения", color: "border-orange-200 bg-orange-50" },
  { key: "closed", title: "Закрыто", color: "border-emerald-200 bg-emerald-50" },
];

export default async function OfficeAppealsBoardPage() {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff-login?next=/office/appeals/board");
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isOfficeRole(role) || !hasPermission(role, "appeals.manage")) {
    redirect("/forbidden");
  }

  const appeals = listAppeals();

  return (
    <div className="space-y-4" data-testid="office-appeals-board">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Доска обращений</h1>
          <p className="text-sm text-zinc-600">Статусы и сроки по обращениям</p>
        </div>
        <AppLink
          href="/office/appeals"
          className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-[#5E704F]"
        >
          К списку
        </AppLink>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {columns.map((col) => (
          <div key={col.key} className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className={`rounded-t-2xl border-b px-4 py-3 text-sm font-semibold text-zinc-800 ${col.color}`}>
              {col.title}
            </div>
            <div className="space-y-3 p-3">
              {appeals.filter((a) => a.status === col.key).length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-3 py-4 text-xs text-zinc-500">
                  Нет обращений
                </div>
              ) : (
                appeals
                  .filter((a) => a.status === col.key)
                  .map((appeal) => (
                    <AppLink
                      key={appeal.id}
                      href={`/office/appeals/${appeal.id}`}
                      className={`block rounded-xl border px-3 py-3 text-sm shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${getAppealSlaContainerClass(appeal.dueAt, appeal.status)}`}
                      data-testid={`office-appeals-item-${appeal.id}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-zinc-900">{appeal.title}</div>
                        {appeal.priority ? (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                            {appeal.priority === "high" ? "Высокий" : appeal.priority === "medium" ? "Средний" : "Низкий"}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-xs text-zinc-600">
                        {appeal.assigneeRole ? `Исполнитель: ${appeal.assigneeRole}` : "Не назначен"}
                      </div>
                      {appeal.dueAt ? (
                        <div className={`text-xs font-semibold ${getDueDateTextClass(appeal.dueAt, appeal.status)}`}>
                          Срок: {new Date(appeal.dueAt).toLocaleDateString("ru-RU")}
                        </div>
                      ) : null}
                    </AppLink>
                  ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
