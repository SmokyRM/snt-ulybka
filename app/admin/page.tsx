import Link from "next/link";
import { redirect } from "next/navigation";
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

const formatAmount = (n?: number | null) => (typeof n === "number" ? n.toFixed(2) : "—");

export default async function AdminDashboard() {
  const user = await getSessionUser();
  if (!isAdmin(user)) {
    redirect("/login");
  }

  const data = await fetchDashboard().catch(() => null);

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
