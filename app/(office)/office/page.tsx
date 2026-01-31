import Link from "next/link";
import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { isOfficeRole, isStaffOrAdmin } from "@/lib/rbac";
import type { Role } from "@/lib/permissions";
import { getInboxStats } from "@/server/services/appeals";
import { getOfficeKpiCounters } from "@/lib/office/kpi";

function Card({
  title,
  value,
  href,
  testId,
}: {
  title: string;
  value?: string;
  href: string;
  testId?: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm hover:bg-zinc-50 transition"
      data-testid={testId}
    >
      <div className="text-sm text-zinc-600">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-zinc-900">{value ?? "—"}</div>
      <div className="mt-2 text-sm text-[#5E704F]">Открыть →</div>
    </Link>
  );
}

function QuickAction({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-50 transition"
    >
      {label}
    </Link>
  );
}

export default async function OfficeDashboardPage() {
  try {
    const session = await getEffectiveSessionUser();

    if (!session) {
      redirect(`/staff-login?next=${encodeURIComponent("/office")}`);
    }

    // Sprint 7.6: Используем ту же логику что в layout.tsx для единообразия
    const effectiveRole = session.role;
    const { normalizeRole, isOfficeRole, isAdminRole } = await import("@/lib/rbac");
    const normalizedRole = normalizeRole(effectiveRole);
    const isOfficeAccess = isOfficeRole(normalizedRole) || isAdminRole(normalizedRole);
    
    if (!isOfficeAccess) {
      // Sprint 7.6: Подробный лог redirect-chain для диагностики
      const redirectChainLog = {
        source: "page",
        file: "app/(office)/office/page.tsx",
        function: "OfficeDashboardPage",
        line: "~63",
        condition: "!isOfficeAccess",
        effectiveRole,
        normalizedRole,
        isOfficeRole: isOfficeRole(normalizedRole),
        isAdminRole: isAdminRole(normalizedRole),
        userId: session?.id ?? null,
      };
      if (process.env.NODE_ENV !== "production") {
        console.warn("[office-page] Redirect to /forbidden:", redirectChainLog);
      }
      redirect("/forbidden?reason=office.only&next=/office&src=page");
    }
    
    // После проверки isOfficeAccess, normalizedRole гарантированно один из office ролей или admin
    const role = normalizedRole as "admin" | "chairman" | "secretary" | "accountant";

  const isChairman = role === "chairman" || role === "admin";
  const isSecretary = role === "secretary" || role === "admin";
  const isAccountant = role === "accountant" || role === "admin";

  // Получаем эффективные счетчики из inbox (агрегация на сервере)
  const inboxStats = { totalOpen: 0, myOpen: 0, dueSoon: 0, overdue: 0 };
  try {
    const stats = await getInboxStats();
    inboxStats.totalOpen = stats.totalOpen;
    inboxStats.myOpen = stats.myOpen;
    inboxStats.dueSoon = stats.dueSoon;
    inboxStats.overdue = stats.overdue;
  } catch {
    // Игнорируем ошибки при получении счетчиков
  }

  // Sprint 3.4: Получаем KPI счетчики для dashboard
  const kpiCounters = { overdue: 0, dueSoon: 0, missingAssignee: 0, missingDueAt: 0 };
  try {
    const kpi = getOfficeKpiCounters();
    kpiCounters.overdue = kpi.overdue;
    kpiCounters.dueSoon = kpi.dueSoon;
    kpiCounters.missingAssignee = kpi.missingAssignee;
    kpiCounters.missingDueAt = kpi.missingDueAt;
  } catch {
    // Игнорируем ошибки при получении KPI счетчиков
  }

  return (
    <div className="space-y-6" data-testid="office-dashboard">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Кабинет сотрудников</h1>
        <p className="text-sm text-zinc-600">
          Быстрый обзор и действия по вашей роли.
        </p>
      </div>

      <form action="/office/search" method="get" className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <label className="block text-sm font-medium text-zinc-700">
          Быстрый поиск
          <input
            type="search"
            name="q"
            placeholder="ФИО, участок, обращение"
            className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#5E704F]"
            data-testid="office-search"
          />
        </label>
      </form>

      {/* Sprint 3.4: KPI счетчики */}
      {(isChairman || isSecretary) && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card 
            title="Просрочено" 
            value={kpiCounters.overdue.toString()} 
            href="/office/inbox?risk=overdue" 
            testId="office-kpi-overdue" 
          />
          <Card 
            title="Скоро срок" 
            value={kpiCounters.dueSoon.toString()} 
            href="/office/inbox?risk=duesoon" 
            testId="office-kpi-duesoon" 
          />
          <Card 
            title="Нет назначения" 
            value={kpiCounters.missingAssignee.toString()} 
            href="/office/quality?type=appeals&category=missingAssignee" 
            testId="office-kpi-missingAssignee" 
          />
          <Card 
            title="Нет срока" 
            value={kpiCounters.missingDueAt.toString()} 
            href="/office/quality?type=appeals&category=missingDueAt" 
            testId="office-kpi-missingDueAt" 
          />
        </div>
      )}

      {/* Карточки с реальными счетчиками */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(isChairman || isSecretary) && (
          <Card title="Обращения: открытые" value={inboxStats.totalOpen.toString()} href="/office/inbox?scope=all" testId="office-card-inbox-total-open" />
        )}
        {(isChairman || isSecretary) && (
          <Card title="Обращения: мои" value={inboxStats.myOpen.toString()} href="/office/inbox?scope=mine" testId="office-card-inbox-my-open" />
        )}
        {isChairman && (
          <Card title="Объявления: черновики" value="—" href="/office/announcements?status=draft" testId="office-card-announcements" />
        )}
        {(isChairman || isSecretary) && (
          <Card title="Реестр участков" value="—" href="/office/registry" testId="office-card-registry" />
        )}
        {isAccountant && (
          <Card title="Финансы: долги" value="—" href="/office/billing" testId="office-card-finance" />
        )}
      </div>

      {/* Quick actions */}
      <div className="space-y-2" data-testid="office-quick-actions">
        <div className="text-sm font-medium text-zinc-700">Быстрые действия</div>
        <div className="flex flex-wrap gap-2">
          {(isChairman || isSecretary || isAccountant) && (
            <QuickAction label="Очередь работы" href="/office/inbox" />
          )}
          {(isChairman || isSecretary) && (
            <QuickAction label="Открыть обращения" href="/office/appeals" />
          )}
          {isChairman && (
            <QuickAction label="Создать объявление" href="/office/announcements/new" />
          )}
          {(isChairman || isSecretary) && (
            <QuickAction label="Открыть реестр" href="/office/registry" />
          )}
          {isSecretary && (
            <QuickAction label="Шаблоны" href="/office/templates" />
          )}
          {isAccountant && (
            <>
              <QuickAction label="Импорт платежей" href="/admin/billing/payments-import" />
              <QuickAction label="Экспорт должников" href="/office/billing" />
            </>
          )}
        </div>
      </div>
    </div>
  );
  } catch (error) {
    // В dev режиме логируем ошибку для отладки
    if (process.env.NODE_ENV !== "production") {
      console.error("[office-page] Error:", error);
    }
    // Пробрасываем ошибку дальше, чтобы error.tsx мог её обработать
    throw error;
  }
}
