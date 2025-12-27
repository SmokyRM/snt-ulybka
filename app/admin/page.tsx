import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/session.server";
import { serverFetchJson } from "@/lib/serverFetch";
import { getHomeViews } from "@/lib/homeViews";
import { getAllAppeals } from "@/lib/appeals";
import { startTestScenario } from "./impersonationActions";

type DashboardData = {
  registry: { totalPlots: number; unconfirmedPlots: number; missingContactsPlots: number };
  billing: {
    membership: { period: string; accruedSum: number; paidSum: number; debtSum: number } | null;
    target: { period: string; accruedSum: number; paidSum: number; debtSum: number } | null;
  };
  electricity: {
    currentPeriod: string;
    missingReadingsCount: number;
    totals: { period: string; accruedSum: number; paidSum: number; debtSum: number } | null;
  };
  imports: { lastImportBatch: { importedAt: string; fileName?: string | null; createdCount: number; skippedCount: number; status: string } | null };
  debtors: {
    membership: { count: number; sumDebt: number };
    electricity: { count: number; sumDebt: number };
  };
};

const fetchDashboard = async (): Promise<DashboardData> => serverFetchJson<DashboardData>("/api/admin/dashboard");

type AnalyticsPoint = {
  period: string;
  membership: { accrued: number; paid: number; debt: number };
  target: { accrued: number; paid: number; debt: number };
  electricity: { accrued: number; paid: number; debt: number };
};

const fetchAnalytics = async (): Promise<AnalyticsPoint[]> => {
  const now = new Date();
  const to = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const from = `${now.getUTCFullYear() - 1}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  try {
    const data = await serverFetchJson<{ points: AnalyticsPoint[] }>(
      `/api/analytics/collections?from=${from}&to=${to}`
    );
    return data.points ?? [];
  } catch {
    return [];
  }
};

const formatAmount = (n?: number | null) => (typeof n === "number" ? n.toFixed(2) : "—");

export default async function AdminDashboard() {
  const user = await getSessionUser();
  if (!isAdmin(user)) {
    redirect("/login");
  }
  const isDev = process.env.NODE_ENV === "development";

  const data = await fetchDashboard().catch(() => null);
  const analytics = await fetchAnalytics();
  const homeViews = await getHomeViews();
  const appeals = await getAllAppeals();
  const appealsNew = appeals.filter((a) => a.status === "new").length;
  const appealsInWork = appeals.filter((a) => a.status === "in_progress").length;
  const debtSummary = data
    ? {
        membership: data.debtors.membership.sumDebt,
        electricity: data.debtors.electricity.sumDebt,
      }
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Админ-панель</h1>
        <span className="rounded-full bg-[#2F3827]/10 px-3 py-1 text-xs font-semibold text-[#2F3827]">
          Только для админов
        </span>
      </div>
      <div className="text-xs text-zinc-700">
        Home views: Old — {homeViews.homeOld} | New — {homeViews.homeNew}
      </div>

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

      {!data ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Не удалось загрузить данные</div>
      ) : (
        <div className="space-y-6">
          <Section title="Сводка">
            <div className="grid gap-4 md:grid-cols-3">
              <Card title="Электроэнергия">
                <div className="space-y-1 text-sm text-zinc-800">
                  <div>Не передали показания: {data.electricity.missingReadingsCount}</div>
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
            </div>
          </Section>

          <Section title="Реестр">
            <Card title="Реестр участков">
              <div className="space-y-1 text-sm text-zinc-800">
                <div>Всего участков: {data.registry.totalPlots}</div>
                <div>Не подтверждено: {data.registry.unconfirmedPlots}</div>
                <div>Без контактов: {data.registry.missingContactsPlots}</div>
              </div>
              <LinkBtn href="/admin/plots">Открыть реестр</LinkBtn>
            </Card>
          </Section>

          <Section title="Деньги">
            <Card title="Членские взносы">
              {data.billing.membership ? (
                <div className="space-y-1 text-sm text-zinc-800">
                  <div>Период: {data.billing.membership.period}</div>
                  <div>Начислено: {formatAmount(data.billing.membership.accruedSum)} ₽</div>
                  <div>Оплачено: {formatAmount(data.billing.membership.paidSum)} ₽</div>
                  <div>Долг: {formatAmount(data.billing.membership.debtSum)} ₽</div>
                </div>
              ) : (
                <Placeholder />
              )}
              <LinkBtn href="/admin/billing">Биллинг</LinkBtn>
            </Card>

            <Card title="Целевые взносы">
              {data.billing.target ? (
                <div className="space-y-1 text-sm text-zinc-800">
                  <div>Период: {data.billing.target.period}</div>
                  <div>Начислено: {formatAmount(data.billing.target.accruedSum)} ₽</div>
                  <div>Оплачено: {formatAmount(data.billing.target.paidSum)} ₽</div>
                  <div>Долг: {formatAmount(data.billing.target.debtSum)} ₽</div>
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
              {data.imports.lastImportBatch ? (
                <div className="space-y-1 text-sm text-zinc-800">
                  <div>Дата: {new Date(data.imports.lastImportBatch.importedAt).toLocaleString("ru-RU")}</div>
                  <div>Файл: {data.imports.lastImportBatch.fileName || "—"}</div>
                  <div>
                    Итог: {data.imports.lastImportBatch.createdCount} / Ошибки: {data.imports.lastImportBatch.skippedCount}
                  </div>
                  <div>Статус: {data.imports.lastImportBatch.status}</div>
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
              <AnalyticsBlock points={analytics} />
            </Card>
          </Section>

          <Section title="Электроэнергия">
            <Card title="Электро начисления">
              {data.electricity.totals ? (
                <div className="space-y-1 text-sm text-zinc-800">
                  <div>Период: {data.electricity.totals.period}</div>
                  <div>Начислено: {formatAmount(data.electricity.totals.accruedSum)} ₽</div>
                  <div>Оплачено: {formatAmount(data.electricity.totals.paidSum)} ₽</div>
                  <div>Долг: {formatAmount(data.electricity.totals.debtSum)} ₽</div>
                  <div>Нет показаний: {data.electricity.missingReadingsCount}</div>
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
                <div>Членские: {data.debtors.membership.count} шт., долг {formatAmount(data.debtors.membership.sumDebt)} ₽</div>
                <div>Электро: {data.debtors.electricity.count} шт., долг {formatAmount(data.debtors.electricity.sumDebt)} ₽</div>
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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#5E704F]">{title}</p>
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
  children: React.ReactNode;
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-[#2F3827]">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

function AnalyticsBlock({ points }: { points: AnalyticsPoint[] }) {
  const dataset = points.slice(-6); // последние 6 месяцев
  const [type, setType] = React.useState<"membership" | "target" | "electricity">("membership");
  if (!dataset.length) return <Placeholder />;
  const max = Math.max(...dataset.map((p) => p[type].accrued), 1);
  return (
    <div className="space-y-3 text-sm text-zinc-800">
      <div className="flex items-center gap-2 text-xs">
        <span className="inline-block h-3 w-3 rounded bg-[#5E704F]" /> Начислено
        <span className="inline-block h-3 w-3 rounded bg-[#9BB487]" /> Оплачено
      </div>
      <div className="flex gap-2 text-xs">
        {(["membership", "target", "electricity"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`rounded-full px-3 py-1 ${
              type === t ? "bg-[#5E704F] text-white" : "border border-zinc-300 text-zinc-800"
            }`}
          >
            {t === "membership" ? "Членские" : t === "target" ? "Целевые" : "Электро"}
          </button>
        ))}
      </div>
      <div className="flex items-end gap-2">
        {dataset.map((p) => {
          const acc = p[type].accrued;
          const paid = p[type].paid;
          const accH = (acc / max) * 100;
          const paidH = (paid / max) * 100;
          return (
            <div key={p.period} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex w-full items-end gap-1">
                <div className="w-1/2 rounded-t bg-[#5E704F]" style={{ height: `${accH}%` }} />
                <div className="w-1/2 rounded-t bg-[#9BB487]" style={{ height: `${paidH}%` }} />
              </div>
              <div className="text-[11px] text-zinc-600">{p.period}</div>
            </div>
          );
        })}
      </div>
      <div className="text-xs text-zinc-600">Данные за последние месяцы</div>
    </div>
  );
}
