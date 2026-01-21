import { redirect } from "next/navigation";
import AppLink from "@/components/AppLink";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { hasPermission, isStaffOrAdmin } from "@/lib/rbac";
import { listAppeals } from "@/server/services/appeals";
import type { AppealStatus } from "@/lib/office/types";

const statusLabels: Record<AppealStatus, string> = {
  new: "Новое",
  in_progress: "В работе",
  needs_info: "Требует уточнения",
  closed: "Закрыто",
};

const statusClass: Record<AppealStatus, string> = {
  new: "bg-blue-100 text-blue-800",
  in_progress: "bg-amber-100 text-amber-800",
  needs_info: "bg-orange-100 text-orange-800",
  closed: "bg-emerald-100 text-emerald-800",
};

type Props = {
  searchParams?: {
    tab?: "new" | "in_progress" | "closed";
    q?: string;
  };
};

export default async function OfficeAppealsPage({ searchParams }: Props) {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff-login?next=/office/appeals");
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    redirect("/forbidden?reason=office.only&next=/office");
  }
  if (!hasPermission(role, "appeals.view")) {
    redirect("/forbidden?reason=office.only&next=/office");
  }

  const tab = searchParams?.tab === "new" || searchParams?.tab === "in_progress" || searchParams?.tab === "closed" ? searchParams.tab : "new";
  const q = searchParams?.q ?? "";
  
  let appeals;
  let allAppeals;
  try {
    // Фильтруем по табу
    const statusParam: AppealStatus = tab === "new" ? "new" : tab === "in_progress" ? "in_progress" : "closed";
    appeals = await listAppeals({ status: statusParam, q });

    // Подсчитываем статистику по статусам (для всех обращений)
    allAppeals = await listAppeals({});
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      redirect("/staff-login?next=/office/appeals");
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      redirect("/forbidden?reason=office.only&next=/office");
    }
    throw error;
  }
  const statsNew = allAppeals.filter((a) => a.status === "new").length;
  const statsInProgress = allAppeals.filter((a) => a.status === "in_progress").length;
  const statsClosed = allAppeals.filter((a) => a.status === "closed").length;

  // Сортируем: новые сверху (по дате обновления, новые первыми)
  const sortedAppeals = [...appeals].sort((a, b) => {
    // Если статус одинаковый, сортируем по дате обновления (новые сверху)
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm" data-testid="office-appeals-page">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">Обращения</h1>
            <p className="text-sm text-zinc-600">Список обращений жителей.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-zinc-600">
            <span className="rounded-full bg-zinc-100 px-3 py-1">Всего: {appeals.length}</span>
            {q ? <span className="rounded-full bg-zinc-50 px-3 py-1">Поиск: &quot;{q}&quot;</span> : null}
          </div>
        </div>

        {/* Табы статусов */}
        <div className="flex border-b border-zinc-200" data-testid="office-appeals-tabs">
          <AppLink
            href="/office/appeals?tab=new"
            className={`-mb-px px-4 py-2 text-sm font-semibold transition ${
              tab === "new"
                ? "border-b-2 border-[#5E704F] text-[#5E704F]"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Новые ({statsNew})
          </AppLink>
          <AppLink
            href="/office/appeals?tab=in_progress"
            className={`-mb-px px-4 py-2 text-sm font-semibold transition ${
              tab === "in_progress"
                ? "border-b-2 border-[#5E704F] text-[#5E704F]"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            В работе ({statsInProgress})
          </AppLink>
          <AppLink
            href="/office/appeals?tab=closed"
            className={`-mb-px px-4 py-2 text-sm font-semibold transition ${
              tab === "closed"
                ? "border-b-2 border-[#5E704F] text-[#5E704F]"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Закрытые ({statsClosed})
          </AppLink>
        </div>

        {/* Поиск */}
        <form method="get" className="flex gap-2">
          <input type="hidden" name="tab" value={tab} />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Поиск по ФИО, участку, теме..."
            className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:border-[#5E704F] focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4d5d41]"
          >
            Найти
          </button>
          {q && (
            <AppLink
              href={`/office/appeals?tab=${tab}`}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-[#5E704F]"
            >
              Сбросить
            </AppLink>
          )}
        </form>
      </div>

      <div className="mt-4 grid gap-3" data-testid="office-appeals-list">
        {sortedAppeals.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-600">
            Обращений по выбранным фильтрам пока нет.
          </div>
        ) : (
          sortedAppeals.map((appeal) => (
            <AppLink
              key={appeal.id}
              href={`/office/appeals/${appeal.id}`}
              className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              data-testid={`office-appeals-item-${appeal.id}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${statusClass[appeal.status]}`}>
                  {statusLabels[appeal.status]}
                </span>
                <span className="text-xs text-zinc-500">
                  Обновлено {new Date(appeal.updatedAt).toLocaleDateString("ru-RU")}
                </span>
              </div>
              <div className="text-base font-semibold text-zinc-900">{appeal.title}</div>
              <div className="text-sm text-zinc-600 line-clamp-2">{appeal.body}</div>
              <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
                {appeal.plotNumber ? <span>Участок: {appeal.plotNumber}</span> : null}
                {appeal.authorName ? <span>Автор: {appeal.authorName}</span> : null}
              </div>
            </AppLink>
          ))
        )}
      </div>
    </div>
  );
}
