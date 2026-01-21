"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppLink from "@/components/AppLink";
import type { Appeal, AppealStatus } from "@/lib/office/types";
import { overdue, dueSoon } from "@/lib/sla";
// Удалён импорт getRegistryUrl - используется только plotNumber для ссылки
import InboxSortSelect from "./InboxSortSelect";
import InboxRowActions from "./InboxRowActions";

const statusLabels: Record<AppealStatus | "overdue" | "due_soon", string> = {
  new: "Новое",
  in_progress: "В работе",
  needs_info: "Требует уточнения",
  closed: "Закрыто",
  overdue: "Просрочено",
  due_soon: "Скоро срок",
};

const statusClass: Record<AppealStatus, string> = {
  new: "bg-blue-100 text-blue-800",
  in_progress: "bg-amber-100 text-amber-800",
  needs_info: "bg-orange-100 text-orange-800",
  closed: "bg-emerald-100 text-emerald-800",
};

type Props = {
  appeals: Appeal[];
  currentUserId: string;
  currentRole: string;
  queueCounters?: {
    all: number;
    secretary: number;
    accountant: number;
    chairman: number;
  };
  initialQueue?: string;
};

function buildQueryString(params: {
  status?: AppealStatus | "overdue" | "due_soon";
  mine?: boolean;
  q?: string;
  sort?: "createdAt" | "dueAt" | "updatedAt";
  dir?: "asc" | "desc";
  queue?: string;
}): string {
  const parts: string[] = [];
  if (params.status) parts.push(`status=${encodeURIComponent(params.status)}`);
  if (params.mine !== undefined) parts.push(`mine=${params.mine ? "1" : "0"}`);
  if (params.q) parts.push(`q=${encodeURIComponent(params.q)}`);
  if (params.sort) parts.push(`sort=${encodeURIComponent(params.sort)}`);
  if (params.dir) parts.push(`dir=${encodeURIComponent(params.dir)}`);
  if (params.queue) parts.push(`queue=${encodeURIComponent(params.queue)}`);
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

export default function InboxClient({ appeals, currentUserId, currentRole, queueCounters, initialQueue }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Парсинг query params
  const statusParam = searchParams.get("status");
  const status: AppealStatus | "overdue" | "due_soon" | undefined =
    statusParam === "new" ||
    statusParam === "in_progress" ||
    statusParam === "needs_info" ||
    statusParam === "closed" ||
    statusParam === "overdue" ||
    statusParam === "due_soon"
      ? (statusParam as AppealStatus | "overdue" | "due_soon")
      : undefined;

  const mineParam = searchParams.get("mine");
  const mine = mineParam === "1" ? true : mineParam === "0" ? false : undefined;

  const q = searchParams.get("q")?.trim() || "";

  const sortParam = searchParams.get("sort");
  const sort: "createdAt" | "dueAt" | "updatedAt" =
    sortParam === "createdAt" || sortParam === "dueAt" || sortParam === "updatedAt"
      ? sortParam
      : "updatedAt";

  const dirParam = searchParams.get("dir");
  const dir: "asc" | "desc" = dirParam === "asc" ? "asc" : "desc";

  // Sprint 6.9: Фильтр по очереди (queue/assigneeRole)
  const queueParam = searchParams.get("queue");
  const queue: "secretary" | "accountant" | "chairman" | "all" | undefined =
    queueParam === "secretary" || queueParam === "accountant" || queueParam === "chairman" || queueParam === "all"
      ? queueParam
      : initialQueue === "secretary" || initialQueue === "accountant" || initialQueue === "chairman" || initialQueue === "all"
      ? (initialQueue as "secretary" | "accountant" | "chairman" | "all")
      : undefined;

  // Локальное состояние для поиска (debounce через URL)
  const [searchQuery, setSearchQuery] = useState(q);

  // Фильтрация и сортировка через useMemo
  const { filteredAppeals, counters } = useMemo(() => {
    const now = new Date();
    let filtered = [...appeals];

    // Фильтр по статусу
    if (status === undefined) {
      // По умолчанию показываем только открытые
      filtered = filtered.filter((appeal) => appeal.status !== "closed");
    } else if (status === "overdue") {
      filtered = filtered.filter((appeal) => {
        if (appeal.status === "closed") return false;
        return overdue(appeal.dueAt, now);
      });
    } else if (status === "due_soon") {
      filtered = filtered.filter((appeal) => {
        if (appeal.status === "closed") return false;
        return dueSoon(appeal.dueAt, now);
      });
    } else {
      filtered = filtered.filter((appeal) => appeal.status === status);
    }

    // Фильтр "Моё/Все"
    if (mine === true) {
      filtered = filtered.filter((appeal) => {
        const assignedToUserId = appeal.assignedToUserId ?? appeal.assigneeUserId ?? null;
        return assignedToUserId === currentUserId;
      });
    }

    // Sprint 6.9: Фильтр по очереди (queue/assigneeRole)
    if (queue && queue !== "all") {
      filtered = filtered.filter((appeal) => appeal.assigneeRole === queue);
    }

    // Поиск
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((appeal) => {
        if (appeal.id.toLowerCase().includes(query)) return true;
        if (appeal.title.toLowerCase().includes(query)) return true;
        if (appeal.body?.toLowerCase().includes(query)) return true;
        if (appeal.authorName?.toLowerCase().includes(query)) return true;
        if (appeal.authorPhone?.toLowerCase().includes(query)) return true;
        if (appeal.plotNumber?.toLowerCase().includes(query)) return true;
        return false;
      });
    }

    // Сортировка
    filtered = [...filtered].sort((a, b) => {
      let aValue: number;
      let bValue: number;

      if (sort === "createdAt") {
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
      } else if (sort === "dueAt") {
        // null значения всегда идут в конец
        if (!a.dueAt && !b.dueAt) return 0;
        if (!a.dueAt) return 1;
        if (!b.dueAt) return -1;
        aValue = new Date(a.dueAt).getTime();
        bValue = new Date(b.dueAt).getTime();
      } else {
        // updatedAt (по умолчанию)
        aValue = new Date(a.updatedAt).getTime();
        bValue = new Date(b.updatedAt).getTime();
      }

      const diff = aValue - bValue;
      return dir === "asc" ? diff : -diff;
    });

    // Подсчет счетчиков
    const totalOpen = appeals.filter((a) => a.status !== "closed").length;
    const myOpen = appeals.filter((a) => {
      if (a.status === "closed") return false;
      const assignedToUserId = a.assignedToUserId ?? a.assigneeUserId ?? null;
      return assignedToUserId === currentUserId;
    }).length;
    const dueSoonCount = appeals.filter((a) => {
      if (a.status === "closed") return false;
      return dueSoon(a.dueAt, now);
    }).length;
    const overdueCount = appeals.filter((a) => {
      if (a.status === "closed") return false;
      return overdue(a.dueAt, now);
    }).length;

    // Статистика по статусам
    const statsNew = appeals.filter((a) => a.status === "new").length;
    const statsInProgress = appeals.filter((a) => a.status === "in_progress").length;
    const statsNeedsInfo = appeals.filter((a) => a.status === "needs_info").length;
    const statsClosed = appeals.filter((a) => a.status === "closed").length;

    return {
      filteredAppeals: filtered,
      counters: {
        totalOpen,
        myOpen,
        dueSoon: dueSoonCount,
        overdue: overdueCount,
        statsNew,
        statsInProgress,
        statsNeedsInfo,
        statsClosed,
        total: appeals.length,
      },
    };
  }, [appeals, status, mine, searchQuery, sort, dir, queue, currentUserId]);

  // Обработка поиска
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (searchQuery) {
        params.set("q", searchQuery);
      } else {
        params.delete("q");
      }
      router.push(`/office/inbox?${params.toString()}`);
    });
  };

  // Сброс поиска
  const handleResetSearch = () => {
    setSearchQuery("");
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("q");
      router.push(`/office/inbox?${params.toString()}`);
    });
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm" data-testid="inbox-root">
      {/* Верхняя панель фильтров */}
      <div className="mb-4 space-y-3">
        {/* Заголовок и счетчики */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">Очередь работы</h1>
            <p className="text-sm text-zinc-600">Единая очередь обращений для сотрудников.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-zinc-100 px-3 py-1 font-semibold text-zinc-700" data-testid="inbox-counter-open">
              Открыто: {counters.totalOpen}
            </span>
            <span className="rounded-full bg-blue-100 px-3 py-1 font-semibold text-blue-800" data-testid="inbox-counter-my">
              Мои: {counters.myOpen}
            </span>
            <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800" data-testid="inbox-counter-duesoon">
              Скоро срок: {counters.dueSoon}
            </span>
            <span className="rounded-full bg-red-100 px-3 py-1 font-semibold text-red-800" data-testid="inbox-counter-overdue">
              Просрочено: {counters.overdue}
            </span>
          </div>
        </div>

        {/* Sprint 6.9: Быстрые табы по очередям */}
        <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-2" data-testid="inbox-tabs">
          <AppLink
            href={buildQueryString({ status, mine, q, sort, dir, queue: "all" })}
            className={`-mb-px px-3 py-2 text-sm font-semibold transition ${
              !queue || queue === "all"
                ? "border-b-2 border-[#5E704F] text-[#5E704F]"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
            data-testid="inbox-tab-all"
          >
            Все {queueCounters ? `(${queueCounters.all})` : ""}
          </AppLink>
          <AppLink
            href={buildQueryString({ status, mine, q, sort, dir, queue: "secretary" })}
            className={`-mb-px px-3 py-2 text-sm font-semibold transition ${
              queue === "secretary"
                ? "border-b-2 border-[#5E704F] text-[#5E704F]"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
            data-testid="inbox-tab-secretary"
          >
            Секретарь {queueCounters ? `(${queueCounters.secretary})` : ""}
          </AppLink>
          <AppLink
            href={buildQueryString({ status, mine, q, sort, dir, queue: "accountant" })}
            className={`-mb-px px-3 py-2 text-sm font-semibold transition ${
              queue === "accountant"
                ? "border-b-2 border-[#5E704F] text-[#5E704F]"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
            data-testid="inbox-tab-accountant"
          >
            Бухгалтерия {queueCounters ? `(${queueCounters.accountant})` : ""}
          </AppLink>
          <AppLink
            href={buildQueryString({ status, mine, q, sort, dir, queue: "chairman" })}
            className={`-mb-px px-3 py-2 text-sm font-semibold transition ${
              queue === "chairman"
                ? "border-b-2 border-[#5E704F] text-[#5E704F]"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
            data-testid="inbox-tab-chairman"
          >
            Председатель {queueCounters ? `(${queueCounters.chairman})` : ""}
          </AppLink>
        </div>

        {/* Фильтр "Моё/Все" */}
        <div className="flex items-center gap-2" data-testid="inbox-filter-scope">
          <span className="text-sm font-medium text-zinc-700">Область:</span>
          <AppLink
            href={buildQueryString({ status, mine: true, q, sort, dir, queue })}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              mine === true
                ? "bg-[#5E704F] text-white"
                : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            Моё
          </AppLink>
          <AppLink
            href={buildQueryString({ status, mine: false, q, sort, dir, queue })}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              mine === false
                ? "bg-[#5E704F] text-white"
                : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            Все
          </AppLink>
        </div>

        {/* Фильтры статусов */}
        <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-2" data-testid="inbox-filter-status">
          <AppLink
            href={buildQueryString({ mine, q, sort, dir, queue })}
            className={`-mb-px px-3 py-2 text-sm font-semibold transition ${
              !status
                ? "border-b-2 border-[#5E704F] text-[#5E704F]"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Все ({counters.total})
          </AppLink>
          <AppLink
            href={buildQueryString({ status: "new", mine, q, sort, dir, queue })}
            className={`-mb-px px-3 py-2 text-sm font-semibold transition ${
              status === "new"
                ? "border-b-2 border-[#5E704F] text-[#5E704F]"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Новые ({counters.statsNew})
          </AppLink>
          <AppLink
            href={buildQueryString({ status: "in_progress", mine, q, sort, dir, queue })}
            className={`-mb-px px-3 py-2 text-sm font-semibold transition ${
              status === "in_progress"
                ? "border-b-2 border-[#5E704F] text-[#5E704F]"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            В работе ({counters.statsInProgress})
          </AppLink>
          <AppLink
            href={buildQueryString({ status: "needs_info", mine, q, sort, dir, queue })}
            className={`-mb-px px-3 py-2 text-sm font-semibold transition ${
              status === "needs_info"
                ? "border-b-2 border-[#5E704F] text-[#5E704F]"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Требует уточнения ({counters.statsNeedsInfo})
          </AppLink>
          <AppLink
            href={buildQueryString({ status: "closed", mine, q, sort, dir, queue })}
            className={`-mb-px px-3 py-2 text-sm font-semibold transition ${
              status === "closed"
                ? "border-b-2 border-[#5E704F] text-[#5E704F]"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Закрытые ({counters.statsClosed})
          </AppLink>
        </div>

        {/* Поиск и сортировка */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <form onSubmit={handleSearch} className="flex flex-1 gap-2" data-testid="inbox-search">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по ID, теме, ФИО, телефону, участку..."
              className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:border-[#5E704F] focus:outline-none"
            />
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4d5d41] disabled:opacity-50"
            >
              Найти
            </button>
            {searchQuery && (
              <button
                type="button"
                onClick={handleResetSearch}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-[#5E704F]"
              >
                Сбросить
              </button>
            )}
          </form>

          {/* Сортировка */}
          <div className="flex items-center gap-2" data-testid="inbox-sort">
            <span className="text-sm font-medium text-zinc-700">Сортировка:</span>
            <InboxSortSelect currentSort={sort} currentDir={dir} />
          </div>
        </div>
      </div>

      {/* Список элементов */}
      <div className="mt-4 grid gap-3" data-testid="inbox-list">
        {filteredAppeals.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center" data-testid="inbox-empty">
            <p className="mb-1 text-sm font-medium text-zinc-700">
              {searchQuery ? "Ничего не найдено" : "Обращений нет"}
            </p>
            <p className="text-xs text-zinc-500">
              {searchQuery
                ? `По запросу "${searchQuery}" ничего не найдено. Попробуйте изменить параметры поиска.`
                : status
                ? `Обращений со статусом "${statusLabels[status] || status}" пока нет.`
                : mine === true
                ? "Вам пока не назначено обращений."
                : "Обращений пока нет."}
            </p>
            {searchQuery && (
              <button
                onClick={handleResetSearch}
                className="mt-3 inline-block rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-[#5E704F]"
              >
                Сбросить поиск
              </button>
            )}
          </div>
        ) : (
          filteredAppeals.map((item) => {
            const now = new Date();
            const itemIsOverdue = overdue(item.dueAt, now);
            const itemIsDueSoon = dueSoon(item.dueAt, now);

            const dueDate = item.dueAt ? new Date(item.dueAt) : null;
            const assignedToUserId = item.assignedToUserId ?? item.assigneeUserId ?? null;

            return (
              <div
                key={item.id}
                className={`flex flex-col gap-2 rounded-xl border px-4 py-3 shadow-sm ${
                  itemIsOverdue ? "border-red-200 bg-red-50" : itemIsDueSoon ? "border-amber-200 bg-amber-50" : ""
                }`}
                data-testid={`inbox-row-${item.id}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {/* Статус */}
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${statusClass[item.status]}`}
                  >
                    {statusLabels[item.status]}
                  </span>

                  {/* Бейдж overdue */}
                  {itemIsOverdue && (
                    <span
                      className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800"
                      data-testid="inbox-badge-overdue"
                    >
                      Просрочено
                    </span>
                  )}

                  {/* Бейдж dueSoon */}
                  {itemIsDueSoon && (
                    <span
                      className="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800"
                      data-testid="inbox-badge-duesoon"
                    >
                      Скоро срок
                    </span>
                  )}
                </div>

                {/* ID, createdAt, type */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  <span>ID: {item.id}</span>
                  <span>Создано: {new Date(item.createdAt).toLocaleDateString("ru-RU")}</span>
                  {item.type && <span>Тип: {item.type}</span>}
                </div>

                {/* Заголовок */}
                <AppLink
                  href={`/office/appeals/${item.id}`}
                  className="text-base font-semibold text-zinc-900 transition hover:text-[#5E704F]"
                >
                  {item.title}
                </AppLink>

                {/* Участок/контакт и dueAt */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                  {item.plotNumber ? (
                    <AppLink
                      href={`/office/registry?q=${encodeURIComponent(item.plotNumber)}`}
                      className="font-semibold text-[#5E704F] hover:underline"
                      data-testid={`inbox-open-plot-${item.id}`}
                    >
                      Участок: {item.plotNumber} →
                    </AppLink>
                  ) : (
                    <AppLink
                      href={`/office/quality?type=appeals&category=missingPlot&q=${encodeURIComponent(item.id)}`}
                      className="text-amber-600 hover:underline"
                      data-testid={`inbox-open-plot-${item.id}`}
                    >
                      Участок не привязан (привязать)
                    </AppLink>
                  )}
                  {item.authorName && <span>{item.authorName}</span>}
                  {dueDate && (
                    <span
                      className={itemIsOverdue ? "font-semibold text-red-700" : itemIsDueSoon ? "font-semibold text-amber-700" : "text-zinc-500"}
                    >
                      Срок: {dueDate.toLocaleDateString("ru-RU")}
                    </span>
                  )}
                </div>

                {/* Управление назначениями */}
                <div className="mt-2 flex items-center justify-between border-t border-zinc-100 pt-2">
                  <InboxRowActions
                    appealId={item.id}
                    assignedToUserId={assignedToUserId}
                    assigneeRole={item.assigneeRole}
                    assigneeName={undefined}
                    currentUserId={currentUserId}
                    currentRole={currentRole}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
