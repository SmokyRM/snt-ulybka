import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { hasPermission, isStaffOrAdmin } from "@/lib/rbac";
import { getIssues } from "@/server/services/dataQuality";
import type { DataQualityIssueType, DataQualityIssue, AppealQualityCategory } from "@/server/services/dataQuality";
import type { AppealStatus } from "@/lib/office/types";
import QualityClient from "./QualityClient";

type Props = {
  searchParams?: {
    type?: DataQualityIssueType;
    category?: "missingContact" | "missingPlot" | "missingDueAt" | "missingAssignee";
    q?: string;
    status?: "open" | "all"; // Sprint 3.3: фильтр по открытым/всем
  };
};

const typeLabels: Record<DataQualityIssueType, string> = {
  plots: "Участки",
  appeals: "Обращения",
  payments: "Платежи",
};

const severityLabels: Record<"low" | "medium" | "high", string> = {
  low: "Низкая",
  medium: "Средняя",
  high: "Высокая",
};

const severityClass: Record<"low" | "medium" | "high", string> = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-red-100 text-red-800",
};

export default async function OfficeQualityPage({ searchParams }: Props) {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff-login?next=/office/quality");
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    redirect("/forbidden?reason=office.only&next=/office");
  }

  // RBAC v1: admin/chairman/secretary видят appeals+plots; accountant видит payments
  const canSeeAppealsPlots = role === "admin" || role === "chairman" || role === "secretary";
  const canSeePayments = role === "accountant" || role === "admin";

  if (!canSeeAppealsPlots && !canSeePayments) {
    redirect("/forbidden?reason=office.only&next=/office");
  }

  const type = searchParams?.type;
  const category = searchParams?.category;
  const q = searchParams?.q ?? "";
  const statusFilter = searchParams?.status || "open"; // Sprint 3.3: по умолчанию только открытые

  let issues;
  try {
    issues = await getIssues({ type: type || undefined });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      redirect("/staff-login?next=/office/quality");
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      redirect("/forbidden?reason=office.only&next=/office");
    }
    throw error;
  }

  // Фильтрация по поисковому запросу, категории и статусу
  let filteredIssues = issues;
  
  // Sprint 3.3: Фильтр по статусу (open/all) - только для обращений
  if (statusFilter === "open" && type === "appeals") {
    filteredIssues = filteredIssues.filter((issue) => {
      if (issue.entityType !== "appeals") return true;
      const appealStatus = issue.metadata?.status as AppealStatus | undefined;
      return appealStatus !== "closed";
    });
  }
  
  // Фильтр по категории (только для обращений)
  if (category && type === "appeals") {
    filteredIssues = filteredIssues.filter(
      (issue) => issue.entityType === "appeals" && issue.metadata?.category === category
    );
  }
  
  // Фильтр по поисковому запросу
  if (q) {
    const query = q.toLowerCase();
    filteredIssues = filteredIssues.filter(
      (issue) =>
        issue.reason.toLowerCase().includes(query) ||
        issue.entityId.toLowerCase().includes(query) ||
        (issue.metadata?.plotNumber && String(issue.metadata.plotNumber).toLowerCase().includes(query)) ||
        (issue.metadata?.title && String(issue.metadata.title).toLowerCase().includes(query)) ||
        (issue.metadata?.authorName && String(issue.metadata.authorName).toLowerCase().includes(query))
    );
  }

  // Группировка по типам
  const issuesByType: Record<DataQualityIssueType, DataQualityIssue[]> = {
    plots: [],
    appeals: [],
    payments: [],
  };

  filteredIssues.forEach((issue) => {
    issuesByType[issue.entityType].push(issue);
  });

  // Статистика по категориям для обращений
  const appealsIssues = issuesByType.appeals;
  const categoryStats = {
    missingContact: appealsIssues.filter((i) => i.metadata?.category === "missingContact").length,
    missingPlot: appealsIssues.filter((i) => i.metadata?.category === "missingPlot").length,
    missingDueAt: appealsIssues.filter((i) => i.metadata?.category === "missingDueAt").length,
    missingAssignee: appealsIssues.filter((i) => i.metadata?.category === "missingAssignee").length,
  };

  // Статистика
  const stats = {
    plots: issuesByType.plots.length,
    appeals: issuesByType.appeals.length,
    payments: issuesByType.payments.length,
    total: filteredIssues.length,
  };

  const categoryLabels: Record<AppealQualityCategory, string> = {
    missingContact: "Нет контакта",
    missingPlot: "Нет участка",
    missingDueAt: "Нет срока",
    missingAssignee: "Нет назначения",
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm" data-testid="quality-root">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">Контроль качества данных</h1>
            <p className="text-sm text-zinc-600">Выявление и исправление проблем в данных.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-zinc-600">
            <span className="rounded-full bg-zinc-100 px-3 py-1">Всего: {stats.total}</span>
            {q ? <span className="rounded-full bg-zinc-50 px-3 py-1">Поиск: &quot;{q}&quot;</span> : null}
          </div>
        </div>

        {/* Фильтры по типам */}
        <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-2" data-testid="quality-type-filters">
          <a
            href="/office/quality"
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              !type
                ? "bg-[#5E704F] text-white"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            }`}
            data-testid="quality-filter-all"
          >
            Все ({stats.total})
          </a>
          {canSeeAppealsPlots && (
            <>
            <a
              href="/office/quality?type=plots"
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                type === "plots"
                  ? "bg-[#5E704F] text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
              data-testid="quality-tab-plots"
            >
              {typeLabels.plots} ({stats.plots})
            </a>
            <a
              href="/office/quality?type=appeals"
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                type === "appeals"
                  ? "bg-[#5E704F] text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
              data-testid="quality-tab-appeals"
            >
              {typeLabels.appeals} ({stats.appeals})
            </a>
            </>
          )}
          {canSeePayments && stats.payments > 0 && (
            <a
              href="/office/quality?type=payments"
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                type === "payments"
                  ? "bg-[#5E704F] text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
              data-testid="quality-tab-payments"
            >
              {typeLabels.payments} ({stats.payments})
            </a>
          )}
        </div>

        {/* Sprint 3.3: Фильтр по статусу (open/all) для обращений */}
        {type === "appeals" && canSeeAppealsPlots && (
          <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-2" data-testid="quality-status-filter">
            <a
              href={`/office/quality?type=appeals&status=open${category ? `&category=${category}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === "open"
                  ? "bg-[#5E704F] text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
              data-testid="quality-status-open"
            >
              Открытые
            </a>
            <a
              href={`/office/quality?type=appeals&status=all${category ? `&category=${category}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === "all"
                  ? "bg-[#5E704F] text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
              data-testid="quality-status-all"
            >
              Все
            </a>
          </div>
        )}

        {/* Фильтры по категориям для обращений */}
        {type === "appeals" && canSeeAppealsPlots && (
          <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-2" data-testid="quality-category-filters">
            <a
              href={`/office/quality?type=appeals&status=${statusFilter}`}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                !category
                  ? "bg-[#5E704F] text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
              data-testid="quality-category-all"
            >
              Все категории ({stats.appeals})
            </a>
            <a
              href={`/office/quality?type=appeals&category=missingContact&status=${statusFilter}`}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                category === "missingContact"
                  ? "bg-red-100 text-red-800"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
              data-testid="quality-category-missing-contact"
            >
              {categoryLabels.missingContact} ({categoryStats.missingContact})
            </a>
            <a
              href={`/office/quality?type=appeals&category=missingPlot&status=${statusFilter}`}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                category === "missingPlot"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
              data-testid="quality-category-missing-plot"
            >
              {categoryLabels.missingPlot} ({categoryStats.missingPlot})
            </a>
            <a
              href={`/office/quality?type=appeals&category=missingDueAt&status=${statusFilter}`}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                category === "missingDueAt"
                  ? "bg-orange-100 text-orange-800"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
              data-testid="quality-category-missing-due-at"
            >
              {categoryLabels.missingDueAt} ({categoryStats.missingDueAt})
            </a>
            <a
              href={`/office/quality?type=appeals&category=missingAssignee&status=${statusFilter}`}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                category === "missingAssignee"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
              data-testid="quality-category-missing-assignee"
            >
              {categoryLabels.missingAssignee} ({categoryStats.missingAssignee})
            </a>
          </div>
        )}

        {/* Поиск */}
        <form className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 sm:grid-cols-3" data-testid="quality-search-form">
          <label className="sm:col-span-2">
            <span className="text-xs font-semibold text-zinc-600">Поиск</span>
            <input
              type="text"
              name="q"
              defaultValue={q}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-[#5E704F] focus:outline-none"
              placeholder="Поиск по проблеме, ID, участку, автору..."
              data-testid="quality-search-input"
            />
          </label>
          <div className="sm:col-span-1 sm:self-end">
            <button
              type="submit"
              className="w-full rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4d5d41]"
              data-testid="quality-search-submit"
            >
              Применить
            </button>
          </div>
          {type && <input type="hidden" name="type" value={type} />}
          {category && <input type="hidden" name="category" value={category} />}
          {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
        </form>

        {/* Секции по типам */}
        <QualityClient
          issuesByType={issuesByType}
          typeLabels={typeLabels}
          severityLabels={severityLabels}
          severityClass={severityClass}
          role={role}
          canSeeAppealsPlots={canSeeAppealsPlots}
          canSeePayments={canSeePayments}
          category={category}
        />
      </div>
    </div>
  );
}
