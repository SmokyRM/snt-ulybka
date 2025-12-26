import Link from "next/link";
import { redirect } from "next/navigation";
import React from "react";
import { getSessionUser, isAdmin } from "@/lib/session.server";

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

const fetchDashboard = async (): Promise<DashboardData> => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/api/admin/dashboard`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to load dashboard");
  }
  return (await res.json()) as DashboardData;
};

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
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/api/analytics/collections?from=${from}&to=${to}`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { points: AnalyticsPoint[] };
  return data.points ?? [];
};

const formatAmount = (n?: number | null) => (typeof n === "number" ? n.toFixed(2) : "—");

export default async function AdminDashboard() {
  const user = await getSessionUser();
  if (!isAdmin(user)) {
    redirect("/login");
  }

  const data = await fetchDashboard().catch(() => null);
  const analytics = await fetchAnalytics();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Админ-панель</h1>
        <span className="rounded-full bg-[#2F3827]/10 px-3 py-1 text-xs font-semibold text-[#2F3827]">
          Только для админов
        </span>
      </div>

      {!data ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Не удалось загрузить данные</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card title="Реестр">
            <div className="space-y-1 text-sm text-zinc-800">
              <div>Всего участков: {data.registry.totalPlots}</div>
              <div>Не подтверждено: {data.registry.unconfirmedPlots}</div>
              <div>Без контактов: {data.registry.missingContactsPlots}</div>
            </div>
            <LinkBtn href="/admin/plots">Открыть реестр</LinkBtn>
          </Card>

          <Card title="Взносы (членские)">
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

          <Card title="Взносы (целевые)">
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
            <LinkBtn href="/admin/billing">Биллинг</LinkBtn>
          </Card>

          <Card title="Электроэнергия">
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

          <Card title="Импорты">
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

          <Card title="Должники (членские)">
            <div className="space-y-1 text-sm text-zinc-800">
              <div>Кол-во: {data.debtors.membership.count}</div>
              <div>Сумма долга: {formatAmount(data.debtors.membership.sumDebt)} ₽</div>
            </div>
            <LinkBtn href="/admin/notifications/debtors?type=membership">Открыть</LinkBtn>
          </Card>

          <Card title="Должники (электро)">
            <div className="space-y-1 text-sm text-zinc-800">
              <div>Кол-во: {data.debtors.electricity.count}</div>
              <div>Сумма долга: {formatAmount(data.debtors.electricity.sumDebt)} ₽</div>
            </div>
            <LinkBtn href="/admin/notifications/debtors?type=electricity">Открыть</LinkBtn>
          </Card>

          <Card title="Аналитика (accrued vs paid)">
            <AnalyticsBlock points={analytics} />
          </Card>
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
