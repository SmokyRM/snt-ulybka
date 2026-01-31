import { redirect } from "next/navigation";
import AppLink from "@/components/AppLink";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { hasPermission, isStaffOrAdmin } from "@/lib/rbac";
import { listAppeals, listAppealsPaged } from "@/server/services/appeals";
import { getStaffUsers } from "@/lib/mockDb";
import type { Appeal, AppealStatus } from "@/lib/office/types";
import AppealsListClient from "./AppealsListClient";
import AppealsFiltersClient from "./AppealsFiltersClient";

type Props = {
  searchParams?: {
    tab?: "new" | "in_progress" | "overdue" | "closed";
    q?: string;
    page?: string;
    limit?: string;
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

  const validTabs = ["new", "in_progress", "overdue", "closed"] as const;
  const tab = validTabs.includes(searchParams?.tab as typeof validTabs[number]) ? searchParams!.tab as typeof validTabs[number] : "new";
  const q = searchParams?.q ?? "";
  const page = Math.max(1, Number(searchParams?.page ?? "1") || 1);
  const limit = Math.min(50, Math.max(5, Number(searchParams?.limit ?? "10") || 10));

  let appeals: Appeal[];
  let allAppeals: Appeal[] = [];
  let total = 0;
  try {
    // Подсчитываем статистику по статусам (для всех обращений)
    allAppeals = await listAppeals({});

    // Sprint 34: Overdue = status != closed && dueAt < now
    const now = new Date();
    const isOverdue = (a: Appeal) =>
      a.status !== "closed" && a.dueAt && new Date(a.dueAt) < now;

    if (tab === "overdue") {
      // Фильтруем overdue обращения
      let filtered = allAppeals.filter(isOverdue);
      if (q) {
        const query = q.toLowerCase();
        filtered = filtered.filter((a) =>
          a.title.toLowerCase().includes(query) ||
          a.body.toLowerCase().includes(query) ||
          a.authorName?.toLowerCase().includes(query) ||
          a.plotNumber?.toLowerCase().includes(query)
        );
      }
      total = filtered.length;
      const start = (page - 1) * limit;
      appeals = filtered.slice(start, start + limit);
    } else {
      // Фильтруем по табу (стандартные статусы)
      const statusParam: AppealStatus = tab === "new" ? "new" : tab === "in_progress" ? "in_progress" : "closed";
      const paged = await listAppealsPaged({ status: statusParam, q, page, limit });
      appeals = paged.items;
      total = paged.total;
    }
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      redirect("/staff-login?next=/office/appeals");
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      redirect("/forbidden?reason=office.only&next=/office");
    }
    throw error;
  }
  const now = new Date();
  const statsNew = allAppeals.filter((a) => a.status === "new").length;
  const statsInProgress = allAppeals.filter((a) => a.status === "in_progress").length;
  const statsOverdue = allAppeals.filter((a) => a.status !== "closed" && a.dueAt && new Date(a.dueAt) < now).length;
  const statsClosed = allAppeals.filter((a) => a.status === "closed").length;

  // Сортируем: новые сверху (по дате обновления, новые первыми)
  const sortedAppeals = [...appeals].sort((a, b) => {
    // Если статус одинаковый, сортируем по дате обновления (новые сверху)
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm" data-testid="office-appeals-page">
      <div className="flex flex-col gap-4" data-testid="office-appeals-root">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">Обращения</h1>
            <p className="text-sm text-zinc-600">Список обращений жителей.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-zinc-600">
            <span className="rounded-full bg-zinc-100 px-3 py-1">Всего: {total}</span>
            {q ? <span className="rounded-full bg-zinc-50 px-3 py-1">Поиск: &quot;{q}&quot;</span> : null}
          </div>
        </div>

        {/* Табы статусов */}
        <div className="flex border-b border-zinc-200" data-testid="office-appeals-tabs">
          <AppLink
            href={`/office/appeals?tab=new${q ? `&q=${encodeURIComponent(q)}` : ""}&page=1&limit=${limit}`}
            className={`-mb-px px-4 py-2 text-sm font-semibold transition ${
              tab === "new"
                ? "border-b-2 border-[#5E704F] text-[#5E704F]"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Новые ({statsNew})
          </AppLink>
          <AppLink
            href={`/office/appeals?tab=in_progress${q ? `&q=${encodeURIComponent(q)}` : ""}&page=1&limit=${limit}`}
            className={`-mb-px px-4 py-2 text-sm font-semibold transition ${
              tab === "in_progress"
                ? "border-b-2 border-[#5E704F] text-[#5E704F]"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            В работе ({statsInProgress})
          </AppLink>
          <AppLink
            href={`/office/appeals?tab=overdue${q ? `&q=${encodeURIComponent(q)}` : ""}&page=1&limit=${limit}`}
            className={`-mb-px px-4 py-2 text-sm font-semibold transition ${
              tab === "overdue"
                ? "border-b-2 border-rose-600 text-rose-600"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
            data-testid="office-appeals-tab-overdue"
          >
            Просрочено ({statsOverdue})
          </AppLink>
          <AppLink
            href={`/office/appeals?tab=closed${q ? `&q=${encodeURIComponent(q)}` : ""}&page=1&limit=${limit}`}
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
        <AppealsFiltersClient tab={tab} initialQuery={q} limit={limit} />
      </div>

      <AppealsListClient appeals={sortedAppeals} staffUsers={getStaffUsers()} />

      {total > limit ? (
        <div className="mt-4 flex items-center justify-between text-xs text-zinc-600">
          <span>
            Страница {page} из {Math.max(1, Math.ceil(total / limit))}
          </span>
          <div className="flex items-center gap-2">
            <AppLink
              href={`/office/appeals?tab=${tab}&q=${encodeURIComponent(q)}&page=${Math.max(1, page - 1)}&limit=${limit}`}
              className={`rounded border border-zinc-200 px-2 py-1 ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
            >
              Назад
            </AppLink>
            <AppLink
              href={`/office/appeals?tab=${tab}&q=${encodeURIComponent(q)}&page=${Math.min(Math.ceil(total / limit), page + 1)}&limit=${limit}`}
              className={`rounded border border-zinc-200 px-2 py-1 ${page >= Math.ceil(total / limit) ? "pointer-events-none opacity-50" : ""}`}
            >
              Вперёд
            </AppLink>
          </div>
        </div>
      ) : null}
    </div>
  );
}
