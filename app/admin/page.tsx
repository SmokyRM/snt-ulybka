import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/session.server";
import { getHomeViews } from "@/lib/homeViews";
import { getAllAppeals } from "@/lib/appeals";
import { RetryButton } from "./RetryButton";
import { startTestScenario } from "./impersonationActions";
import AdminAnalyticsClient from "./AdminAnalyticsClient";
import type { ReactNode } from "react";
import { getAdminDashboardData, type DashboardData } from "@/lib/adminDashboard";
import { getCollectionsAnalytics, type CollectionPoint } from "@/lib/analytics";

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
  if (!isAdmin(user)) {
    redirect("/login?next=/admin");
  }
  const isDev = process.env.NODE_ENV === "development";

  const dashboardBlock = await loadBlock<DashboardData>("dashboard", async () => getAdminDashboardData());
  const analyticsBlock = await loadBlock("analytics", async () => getAnalyticsPoints());
  const homeViewsBlock = await loadBlock("home_views", getHomeViews);
  const appealsBlock = await loadBlock("appeals", getAllAppeals);

  const dashboardData = dashboardBlock.data;
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Админ-панель</h1>
        <span className="rounded-full bg-[#2F3827]/10 px-3 py-1 text-xs font-semibold text-[#2F3827]">
          Только для админов
        </span>
      </div>
      <div className="text-xs text-zinc-700">Home views: Old — {homeViews.homeOld} | New — {homeViews.homeNew}</div>

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

      {isDev && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm">
          <div className="font-semibold text-emerald-900">Тестовые сценарии</div>
          <p className="mt-1 text-xs text-emerald-700">
            Создаёт/обновляет тестовые данные, не влияет на реальные записи.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <form action={startTestScenario}>
              <input type="hidden" name="scenario" value="empty" />
              <button
                type="submit"
                className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-semibold text-emerald-800 hover:border-emerald-400"
              >
                Открыть кабинет: первый вход
              </button>
            </form>
            <form action={startTestScenario}>
              <input type="hidden" name="scenario" value="pending" />
              <button
                type="submit"
                className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-semibold text-emerald-800 hover:border-emerald-400"
              >
                Профиль заполнен, членство не подтверждено
              </button>
            </form>
            <form action={startTestScenario}>
              <input type="hidden" name="scenario" value="verified" />
              <button
                type="submit"
                className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-semibold text-emerald-800 hover:border-emerald-400"
              >
                Подтверждено + участок привязан
              </button>
            </form>
          </div>
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
                <div>Новые: {appealsNew}</div>
                <div>В работе: {appealsInWork}</div>
              </div>
              <LinkBtn href="/admin/appeals">Открыть</LinkBtn>
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
              <LinkBtn href="/admin/notifications/debtors?type=membership">Должники</LinkBtn>
            </Card>
          </Section>

          <Section title="Реестр">
            <Card title="Реестр участков">
              <div className="space-y-1 text-sm text-zinc-800">
                <div>Всего участков: {dashboardData.registry.totalPlots}</div>
                <div>Не подтверждено: {dashboardData.registry.unconfirmedPlots}</div>
                <div>Без контактов: {dashboardData.registry.missingContactsPlots}</div>
              </div>
              <LinkBtn href="/admin/plots">Открыть реестр</LinkBtn>
            </Card>
          </Section>

          <Section title="Деньги">
            <Card title="Членские взносы">
              {dashboardData.billing.membership ? (
                <div className="space-y-1 text-sm text-zinc-800">
                  <div>Период: {dashboardData.billing.membership.period}</div>
                  <div>Начислено: {formatAmount(dashboardData.billing.membership.accruedSum)} ₽</div>
                  <div>Оплачено: {formatAmount(dashboardData.billing.membership.paidSum)} ₽</div>
                  <div>Долг: {formatAmount(dashboardData.billing.membership.debtSum)} ₽</div>
                </div>
              ) : (
                <Placeholder />
              )}
              <LinkBtn href="/admin/billing">Биллинг</LinkBtn>
            </Card>

            <Card title="Целевые взносы">
              {dashboardData.billing.target ? (
                <div className="space-y-1 text-sm text-zinc-800">
                  <div>Период: {dashboardData.billing.target.period}</div>
                  <div>Начислено: {formatAmount(dashboardData.billing.target.accruedSum)} ₽</div>
                  <div>Оплачено: {formatAmount(dashboardData.billing.target.paidSum)} ₽</div>
                  <div>Долг: {formatAmount(dashboardData.billing.target.debtSum)} ₽</div>
                </div>
              ) : (
                <Placeholder />
              )}
              <div className="flex gap-2">
                <LinkBtn href="/admin/billing">Биллинг</LinkBtn>
                <LinkBtn href="/admin/targets" variant="secondary">
                  Цели
                </LinkBtn>
              </div>
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
              <div className="flex gap-2">
                <LinkBtn href="/admin/billing/import">Импорт</LinkBtn>
                <LinkBtn href="/admin/billing/imports" variant="secondary">
                  История
                </LinkBtn>
              </div>
            </Card>

            <Card title="Аналитика (accrued vs paid)">
              <AdminAnalyticsClient points={analytics} />
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

          <Section title="Обращения">
            <Card title="Тикеты">
              <div className="space-y-1 text-sm text-zinc-800">
                <div>Управление обращениями жителей</div>
                <div>Проверка статусов и ответы</div>
              </div>
              <LinkBtn href="/admin/tickets">Перейти</LinkBtn>
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
                <LinkBtn href="/admin/notifications/debtors?type=membership">Членские</LinkBtn>
                <LinkBtn href="/admin/notifications/debtors?type=electricity" variant="secondary">
                  Электро
                </LinkBtn>
              </div>
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
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  const base = "inline-flex rounded-full px-4 py-2 text-sm font-semibold transition";
  const cls =
    variant === "secondary"
      ? `${base} border border-[#5E704F] text-[#5E704F] hover:bg-[#5E704F] hover:text-white`
      : `${base} bg-[#5E704F] text-white hover:bg-[#4f5f42]`;
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
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
