import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import dynamicImport from "next/dynamic";

export const dynamic = "force-dynamic";
import { getHomeViews } from "@/lib/homeViews";
import { getAllAppeals } from "@/lib/appeals";
import { RetryButton } from "./RetryButton";
import { startTestScenario } from "./impersonationActions";
import type { ReactNode } from "react";
import { getAdminDashboardData, type DashboardData } from "@/lib/adminDashboard";
import { getCollectionsAnalytics, type CollectionPoint } from "@/lib/analytics";
import { getPlots, listRegistryImports } from "@/lib/mockDb";
import { listAppeals } from "@/lib/appeals.store";
import { isOverdue } from "@/lib/appealsSla";
import { normalizeArray } from "@/lib/utils/array";
import type { RegistryImport } from "@/types/snt";

// Динамический импорт тяжёлого компонента аналитики только для admin
// Компонент уже использует dynamic внутри, поэтому ssr: false не нужен здесь
const AnalyticsBlockLazy = dynamicImport(() => import("@/components/admin/AnalyticsBlockLazy"));

const getAnalyticsPoints = (): CollectionPoint[] => {
  const now = new Date();
  const to = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const from = `${now.getUTCFullYear() - 1}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  return getCollectionsAnalytics({ from, to }).points ?? [];
};

const formatAmount = (n?: number | null) => (typeof n === "number" ? n.toFixed(2) : "—");

type LoadResult<T> = { ok: boolean; data: T | null; error: string | null };

const logLoadError = (block: string, error: unknown) => {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error("admin_dashboard_load_failed", {
    block: String(block ?? "unknown"),
    message: String(err.message ?? "Unknown error"),
    name: (err as { name?: string }).name ?? "Error",
    stack: err.stack ?? undefined,
  });
};

const loadBlock = async <T,>(block: string, loader: () => Promise<T>): Promise<LoadResult<T>> => {
  try {
    const data = await loader();
    return { ok: true, data, error: null };
  } catch (error) {
    logLoadError(block, error);
    return { ok: false, data: null, error: "Ошибка загрузки. Попробуйте обновить страницу." };
  }
};

export default async function AdminDashboard() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/staff-login?next=/admin");
  }
  // КРИТИЧНО: Используем normalizeRole для нормализации роли (как в middleware)
  const { normalizeRole, isAdminRole } = await import("@/lib/rbac");
  const normalizedRole = normalizeRole(user.role);
  // Проверяем что роль admin через isAdminRole
  if (!isAdminRole(normalizedRole)) {
    const { getForbiddenReason } = await import("@/lib/rbac");
    // normalizedRole может быть "guest", но getForbiddenReason принимает string
    const reason = getForbiddenReason(normalizedRole as "admin" | "resident" | "chairman" | "secretary" | "accountant", "admin.access");
    redirect(`/forbidden?reason=${encodeURIComponent(reason)}&next=${encodeURIComponent("/admin")}`);
  }
  // После проверки isAdminRole, normalizedRole гарантированно "admin"
  const role = normalizedRole as "admin";
  const dashboardBlock = await loadBlock<DashboardData>("dashboard", async () => getAdminDashboardData());
  
  // Load additional metrics
  const metricsBlock = await loadBlock<{
    registry: {
      totalPlots: number;
      verifiedPlots: number;
      missingOwnerPlots: number;
      missingPhonePlots: number;
    };
    appeals: {
      totalOpen: number;
      overdue: number;
    };
    lastRegistryImport: {
      id: string;
      createdAt: string;
      fileName: string | null;
      summary: string;
      errorsCount: number;
    } | null;
    topQualityIssues: Array<{ type: string; count: number }>;
  }>("metrics", async () => {
    const plots = getPlots();
    const appeals = listAppeals({});
    
    function mapPlotStatusToVerificationStatus(status?: string | null): "draft" | "pending" | "verified" | null {
      if (!status) return null;
      if (status === "VERIFIED" || status === "active") return "verified";
      if (status === "CLAIMED" || status === "INVITE_READY") return "pending";
      if (status === "DRAFT") return "draft";
      return null;
    }

    // Registry stats
    const totalPlots = plots.length;
    const verifiedPlots = plots.filter((p) => mapPlotStatusToVerificationStatus(p.status) === "verified").length;
    const missingOwnerPlots = plots.filter((p) => !p.ownerFullName).length;
    const missingPhonePlots = plots.filter((p) => p.ownerFullName && !p.phone).length;

    // Appeals stats
    const openAppeals = appeals.filter((a) => a.status !== "closed");
    const totalOpen = openAppeals.length;
    const overdueCount = openAppeals.filter((a) => isOverdue(a.dueAt, a.status)).length;

    // Last import summary
    const registryImports = normalizeArray<RegistryImport>(listRegistryImports());
    const lastRegistryImport: RegistryImport | null = registryImports[0] ?? null;

    // Top quality issues
    const phoneFrequency = new Map<string, number>();
    plots.forEach((plot) => {
      if (plot.phone) {
        const normalized = plot.phone.replace(/\D/g, "");
        if (normalized.length >= 10) {
          phoneFrequency.set(normalized, (phoneFrequency.get(normalized) || 0) + 1);
        }
      }
    });

    const qualityIssues = {
      plots_without_owner: missingOwnerPlots,
      owners_without_phone: missingPhonePlots,
      verification_not_verified: plots.filter((p) => {
        const status = mapPlotStatusToVerificationStatus(p.status);
        return status !== "verified" && status !== null;
      }).length,
      duplicate_phones: Array.from(phoneFrequency.values()).filter((count) => count > 1).length,
      appeals_without_plotId: appeals.filter((a) => {
        if (!a.plotNumber) return false;
        const plot = plots.find((p) => p.plotNumber === a.plotNumber);
        return !plot;
      }).length,
    };

    const topIssues = Object.entries(qualityIssues)
      .filter(([_, count]) => count > 0)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    return {
      registry: {
        totalPlots,
        verifiedPlots,
        missingOwnerPlots,
        missingPhonePlots,
      },
      appeals: {
        totalOpen,
        overdue: overdueCount,
      },
      lastRegistryImport: lastRegistryImport
        ? {
            id: lastRegistryImport.id,
            createdAt: lastRegistryImport.createdAt,
            fileName: lastRegistryImport.fileName ?? null,
            summary: lastRegistryImport.summary,
            errorsCount: lastRegistryImport.errorsCount,
          }
        : null,
      topQualityIssues: topIssues,
    };
  });
  const analyticsBlock = await loadBlock("analytics", async () => getAnalyticsPoints());
  const homeViewsBlock = await loadBlock("home_views", getHomeViews);
  const appealsBlock = await loadBlock("appeals", getAllAppeals);

  const dashboardData = dashboardBlock.data;
  const metrics = metricsBlock.data;
  const analytics = analyticsBlock.data ?? [];
  const homeViews = homeViewsBlock.data ?? { homeOld: 0, homeNew: 0 };
  const appeals = appealsBlock.data ?? [];
  const appealsNew = appeals.filter((a) => a.status === "new").length;
  const appealsInWork = appeals.filter((a) => a.status === "in_progress").length;
  const debtSummary = dashboardData
    ? {
        membership: dashboardData.debtors.membership.sumDebt,
        electricity: dashboardData.debtors.electricity.sumDebt,
      }
    : null;

  const errors = [
    dashboardBlock.error ? { label: "Реестр и сводка", message: dashboardBlock.error } : null,
    analyticsBlock.error ? { label: "Аналитика", message: analyticsBlock.error } : null,
    homeViewsBlock.error ? { label: "Статистика главной", message: homeViewsBlock.error } : null,
    appealsBlock.error ? { label: "Обращения", message: appealsBlock.error } : null,
  ].filter(Boolean) as Array<{ label: string; message: string }>;

  return (
    <div className="space-y-6" data-testid="admin-shell">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Админ-панель</h1>
        <span className="rounded-full bg-[#2F3827]/10 px-3 py-1 text-xs font-semibold text-[#2F3827]">
          Только для админов
        </span>
      </div>
      <div className="text-xs text-zinc-700">Home views: Old — {homeViews.homeOld} | New — {homeViews.homeNew}</div>

      {/* Quick Actions */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm" data-testid="admin-quick-actions">
        <h2 className="mb-3 text-sm font-semibold text-zinc-700">Быстрые действия</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/admin/registry?tab=people"
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-800 transition hover:border-[#5E704F] hover:bg-zinc-50"
          >
            Реестр
          </Link>
          <Link
            href="/admin/registry?tab=import"
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-800 transition hover:border-[#5E704F] hover:bg-zinc-50"
          >
            Импорт реестра
          </Link>
          <Link
            href="/admin/billing/periods-unified"
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-800 transition hover:border-[#5E704F] hover:bg-zinc-50"
          >
            Начисления
          </Link>
          <Link
            href="/admin/billing/debts"
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-800 transition hover:border-[#5E704F] hover:bg-zinc-50"
          >
            Долги
          </Link>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((item) => (
            <div key={item.label} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <div>
                <div className="font-semibold">Не удалось загрузить: {item.label}</div>
                <div className="text-red-600">{item.message}</div>
              </div>
              <RetryButton />
            </div>
          ))}
        </div>
      )}

      {!dashboardData ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600 shadow-sm">
          Разделы сводки временно недоступны.
        </div>
      ) : (
        <div className="space-y-6">
          <Section title="Сводка">
            <Card title="Электроэнергия">
              <div className="space-y-1 text-sm text-zinc-800">
                <div>Не передали показания: {dashboardData.electricity.missingReadingsCount}</div>
              </div>
              <LinkBtn href="/admin/electricity">Перейти</LinkBtn>
            </Card>
            <Card title="Обращения">
              <div className="space-y-1 text-sm text-zinc-800">
                {metrics && (
                  <>
                    <div>Открыто: {metrics.appeals.totalOpen}</div>
                    {metrics.appeals.overdue > 0 && (
                      <div className="text-red-600 font-semibold">Просрочено: {metrics.appeals.overdue}</div>
                    )}
                  </>
                )}
                <div>Новые: {appealsNew}</div>
                <div>В работе: {appealsInWork}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <LinkBtn href="/office/appeals">Открыть</LinkBtn>
                {metrics && metrics.appeals.overdue > 0 && (
                  <LinkBtn href="/office/appeals?tab=in_progress" variant="secondary" title="Просроченные обращения (показаны в работе)">
                    Просроченные ({metrics.appeals.overdue})
                  </LinkBtn>
                )}
              </div>
            </Card>
            <Card title="Долги">
              {debtSummary ? (
                <div className="space-y-1 text-sm text-zinc-800">
                  <div>Членские: {formatAmount(debtSummary.membership)} ₽</div>
                  <div>Электро: {formatAmount(debtSummary.electricity)} ₽</div>
                </div>
              ) : (
                <Placeholder />
              )}
              <LinkBtn href="/admin/billing/debtors">Должники</LinkBtn>
            </Card>
          </Section>

          <Section title="Реестр">
            <Card title="Реестр">
              <div className="space-y-1 text-sm text-zinc-800">
                <div>Всего участков: {dashboardData.registry.totalPlots}</div>
                {metrics && (
                  <>
                    <div>Подтверждено: {metrics.registry.verifiedPlots}</div>
                    <div>Без владельца: {metrics.registry.missingOwnerPlots}</div>
                    <div>Без телефона: {metrics.registry.missingPhonePlots}</div>
                  </>
                )}
                <div>Не подтверждено: {dashboardData.registry.unconfirmedPlots}</div>
                <div>Без контактов: {dashboardData.registry.missingContactsPlots}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <LinkBtn href="/admin/registry">Открыть реестр</LinkBtn>
                {metrics && metrics.registry.missingOwnerPlots > 0 && (
                  <LinkBtn href="/admin/quality?issueType=plots_without_owner" variant="secondary">
                    Без владельца
                  </LinkBtn>
                )}
                {metrics && metrics.registry.missingPhonePlots > 0 && (
                  <LinkBtn href="/admin/quality?issueType=owners_without_phone" variant="secondary">
                    Без телефона
                  </LinkBtn>
                )}
              </div>
            </Card>
          </Section>

          <Section title="Деньги">
            <Card title="Членские взносы">
              {dashboardData.billing.membership ? (
                <div className="space-y-1 text-sm text-zinc-800">
                  <div>Период: {dashboardData.billing.membership.period}</div>
                  <div>Начислено: {formatAmount(dashboardData.billing.membership.accruedSum)} ₽</div>
                  <div>Оплачено: {formatAmount(dashboardData.billing.membership.paidSum)} ₽</div>
                  <Link
                    href="/admin/billing/debts"
                    className="inline-flex items-center gap-1 text-[#5E704F] hover:underline"
                    title="Открыть долги по членским"
                  >
                    Долг: {formatAmount(dashboardData.billing.membership.debtSum)} ₽
                  </Link>
                </div>
              ) : (
                <Placeholder />
              )}
              <CTAGroup
                className="mt-auto"
                primary={{
                  href: "/admin/billing",
                  label: "Биллинг",
                  title: "Перейти в биллинг",
                }}
                secondary={{
                  href: "/admin/billing/debtors",
                  label: "Должники",
                  title: "Список должников",
                }}
              />
            </Card>

            <Card title="Целевые взносы">
              {dashboardData.billing.target ? (
                <div className="space-y-1 text-sm text-zinc-800">
                  <div>Период: {dashboardData.billing.target.period}</div>
                  <div>Начислено: {formatAmount(dashboardData.billing.target.accruedSum)} ₽</div>
                  <div>Оплачено: {formatAmount(dashboardData.billing.target.paidSum)} ₽</div>
                  <Link
                    href="/admin/billing/debts"
                    className="inline-flex items-center gap-1 text-[#5E704F] hover:underline"
                    title="Открыть долги по целевым"
                  >
                    Долг: {formatAmount(dashboardData.billing.target.debtSum)} ₽
                  </Link>
                </div>
              ) : (
                <Placeholder />
              )}
              <CTAGroup
                className="mt-auto"
                primary={{
                  href: "/admin/billing",
                  label: "Биллинг",
                  title: "Перейти в биллинг",
                }}
                secondary={{
                  href: "/admin/targets",
                  label: "Цели",
                  title: "Список целей",
                }}
              />
            </Card>

            <Card title="Импорты платежей">
              {dashboardData.imports.lastImportBatch ? (
                <div className="space-y-1 text-sm text-zinc-800">
                  <div>Дата: {new Date(dashboardData.imports.lastImportBatch.importedAt).toLocaleString("ru-RU")}</div>
                  <div>Файл: {dashboardData.imports.lastImportBatch.fileName || "—"}</div>
                  <div>
                    Итог: {dashboardData.imports.lastImportBatch.createdCount} / Ошибки: {dashboardData.imports.lastImportBatch.skippedCount}
                  </div>
                  <div>Статус: {dashboardData.imports.lastImportBatch.status}</div>
                </div>
              ) : (
                <Placeholder />
              )}
              <CTAGroup
                className="mt-auto"
                primary={{
                  href: "/admin/billing/payments-import",
                  label: "Импорт",
                  title: "Создать импорт",
                }}
                secondary={{
                  href: "/admin/billing/imports",
                  label: "История",
                  title: "История импортов",
                }}
              />
            </Card>

            <Card title="Последний импорт реестра">
              {metrics && metrics.lastRegistryImport ? (
                <div className="space-y-1 text-sm text-zinc-800">
                  <div>Дата: {new Date(metrics.lastRegistryImport.createdAt).toLocaleString("ru-RU")}</div>
                  <div>Файл: {metrics.lastRegistryImport.fileName || "—"}</div>
                  <div>{metrics.lastRegistryImport.summary}</div>
                  {metrics.lastRegistryImport.errorsCount > 0 && (
                    <div className="text-red-600">Ошибок: {metrics.lastRegistryImport.errorsCount}</div>
                  )}
                </div>
              ) : (
                <Placeholder />
              )}
              <CTAGroup
                className="mt-auto"
                primary={{
                  href: "/admin/registry/import",
                  label: "Импорт",
                  title: "Создать импорт реестра",
                }}
                secondary={{
                  href: "/admin/registry/import/history",
                  label: "История",
                  title: "История импортов реестра",
                }}
              />
            </Card>

            <Card title="Должники">
              <div className="space-y-1 text-sm text-zinc-800">
                <div>
                  Членские: {dashboardData.debtors.membership.count} шт., долг {formatAmount(dashboardData.debtors.membership.sumDebt)} ₽
                </div>
                <div>
                  Электро: {dashboardData.debtors.electricity.count} шт., долг {formatAmount(dashboardData.debtors.electricity.sumDebt)} ₽
                </div>
              </div>
              <div className="flex gap-2">
                <LinkBtn href="/admin/billing/debtors">Должники</LinkBtn>
                <LinkBtn href="/admin/billing/notifications" variant="secondary">
                  Электро
                </LinkBtn>
              </div>
            </Card>

            <Card title="Аналитика (accrued vs paid)">
              <AnalyticsBlockLazy points={analytics} />
            </Card>
          </Section>

          <Section title="Электроэнергия">
            <Card title="Электро начисления">
              {dashboardData.electricity.totals ? (
                <div className="space-y-1 text-sm text-zinc-800">
                  <div>Период: {dashboardData.electricity.totals.period}</div>
                  <div>Начислено: {formatAmount(dashboardData.electricity.totals.accruedSum)} ₽</div>
                  <div>Оплачено: {formatAmount(dashboardData.electricity.totals.paidSum)} ₽</div>
                  <div>Долг: {formatAmount(dashboardData.electricity.totals.debtSum)} ₽</div>
                  <div>Нет показаний: {dashboardData.electricity.missingReadingsCount}</div>
                </div>
              ) : (
                <Placeholder />
              )}
              <div className="flex gap-2">
                <LinkBtn href="/admin/electricity/readings">Показания</LinkBtn>
                <LinkBtn href="/admin/electricity/report" variant="secondary">
                  Отчёт
                </LinkBtn>
              </div>
            </Card>
          </Section>

          <Section title="Качество данных">
            <Card title="Топ проблем">
              {metrics && metrics.topQualityIssues && metrics.topQualityIssues.length > 0 ? (
                <div className="space-y-2 text-sm text-zinc-800">
                  {metrics.topQualityIssues.map((issue) => {
                    const labels: Record<string, string> = {
                      plots_without_owner: "Участки без владельца",
                      owners_without_phone: "Владельцы без телефона",
                      verification_not_verified: "Не подтверждено",
                      duplicate_phones: "Дублирующиеся телефоны",
                      appeals_without_plotId: "Обращения без участка",
                    };
                    const issueTypeMap: Record<string, string> = {
                      plots_without_owner: "plots_without_owner",
                      owners_without_phone: "owners_without_phone",
                      verification_not_verified: "verification_not_verified",
                      duplicate_phones: "duplicate_phones",
                      appeals_without_plotId: "appeals_without_plotId",
                    };
                    return (
                      <Link
                        key={issue.type}
                        href={`/admin/quality?issueType=${issueTypeMap[issue.type] || issue.type}`}
                        className="flex items-center justify-between hover:text-[#5E704F]"
                      >
                        <span>{labels[issue.type] || issue.type}</span>
                        <span className="font-semibold">{issue.count}</span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-zinc-600">Проблем не обнаружено</div>
              )}
              <LinkBtn href="/admin/quality" className="mt-auto">Открыть качество данных</LinkBtn>
            </Card>
          </Section>

          <Section title="Настройки">
            <Card title="Цели и публичные отчёты">
              <div className="space-y-1 text-sm text-zinc-800">
                <div>Управление целевыми сборами и прозрачностью</div>
                <div>Публичные цели и прогресс</div>
              </div>
              <div className="flex gap-2">
                <LinkBtn href="/admin/targets">Цели</LinkBtn>
                <LinkBtn href="/reports/goals" variant="secondary">
                  Публично
                </LinkBtn>
              </div>
            </Card>
          </Section>
        </div>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex h-full min-w-0 flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="break-words text-xs font-semibold uppercase tracking-widest text-[#5E704F]">{title}</p>
      {children}
    </div>
  );
}

function LinkBtn({
  href,
  children,
  variant = "primary",
  className,
  ariaLabel,
  title,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
  ariaLabel?: string;
  title?: string;
}) {
  const base = "inline-flex rounded-full px-4 py-2 text-sm font-semibold transition";
  const cls =
    variant === "secondary"
      ? `${base} border border-[#5E704F] text-[#5E704F] hover:bg-[#5E704F] hover:text-white`
      : `${base} bg-[#5E704F] text-white hover:bg-[#4f5f42]`;
  return (
    <Link href={href} className={`${cls} ${className ?? ""}`} aria-label={ariaLabel} title={title}>
      {children}
    </Link>
  );
}

function CTAGroup({
  primary,
  secondary,
  className,
}: {
  primary: { href: string; label: string; title: string };
  secondary: { href: string; label: string; title: string };
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 sm:flex-row ${className ?? ""}`}>
      <LinkBtn
        href={primary.href}
        ariaLabel={primary.title}
        title={primary.title}
        className="w-full justify-center text-center sm:w-auto"
      >
        {primary.label}
      </LinkBtn>
      <LinkBtn
        href={secondary.href}
        variant="secondary"
        ariaLabel={secondary.title}
        title={secondary.title}
        className="w-full justify-center text-center sm:w-auto"
      >
        {secondary.label}
      </LinkBtn>
    </div>
  );
}

function Placeholder() {
  return <div className="rounded border border-dashed border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">Нет данных</div>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-[#2F3827]">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}
