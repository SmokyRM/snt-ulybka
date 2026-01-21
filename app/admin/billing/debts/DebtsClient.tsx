"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { UnifiedBillingPeriod } from "@/types/snt";
import EmptyStateCard from "@/components/EmptyStateCard";
import type { PlotDebtRow, PersonDebtRow } from "../../../api/admin/billing/debts/route";
import { buildXlsxFromArray, downloadXlsx } from "@/lib/excel";
import ExportButtons from "../../_components/ExportButtons";
import { readOk } from "@/lib/api/client";

type DebtsResponse = {
  items: PlotDebtRow[] | PersonDebtRow[];
  totals: { count: number; sumMembership: number; sumTarget: number; sumElectric: number; sumTotal: number };
  period: { id: string; from: string; to: string; title: string | null; status: string } | null;
  mode: "plots" | "people";
};

type PeriodsResponse = { periods: UnifiedBillingPeriod[] };

type StatusFilter = "all" | "debt>0" | "debt=0" | "credit<0";
type PhoneFilter = "all" | "hasPhone" | "noPhone";
type SortKey = "debtTotal" | "overdueDays" | "fullName" | "plotNumber";

function hasPhone(phone: string): boolean {
  const s = (phone ?? "").trim();
  return s.length > 0 && s !== "—";
}

function isPlotRow(r: PlotDebtRow | PersonDebtRow): r is PlotDebtRow {
  return "plotId" in r;
}

export default function DebtsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const mode = (searchParams.get("mode") === "people" ? "people" : "plots") as "plots" | "people";
  const periodId = searchParams.get("periodId") || null;
  const status = (searchParams.get("status") || "all") as StatusFilter;
  const phone = (searchParams.get("phone") || "all") as PhoneFilter;
  const minDebt = searchParams.get("minDebt") ?? "";
  const q = searchParams.get("q") ?? "";
  const sort = (searchParams.get("sort") || "debtTotal") as SortKey;
  const dir = searchParams.get("dir") === "asc" ? "asc" : "desc";

  const [periods, setPeriods] = useState<UnifiedBillingPeriod[]>([]);
  const [data, setData] = useState<DebtsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const updateParams = useCallback(
    (updates: Partial<Record<string, string | null>>) => {
      const p = new URLSearchParams(searchParams?.toString() ?? "");
      for (const [k, v] of Object.entries(updates)) {
        if (v === undefined || v === null || v === "") p.delete(k);
        else p.set(k, String(v));
      }
      router.replace(`${pathname}?${p.toString()}`);
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    fetch("/api/admin/billing/periods", { cache: "no-store" })
      .then(async (r) => {
        const { periods } = await readOk<PeriodsResponse>(r);
        return periods ?? [];
      })
      .then((periods) => setPeriods(periods))
      .catch(() => setPeriods([]));
  }, []);

  useEffect(() => {
    // Data fetch: set loading/error at start, then resolve in promise callbacks
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (periodId) params.set("periodId", periodId);
    params.set("mode", mode);
    fetch(`/api/admin/billing/debts?${params}`)
      .then(async (res) => {
        const data = await readOk<DebtsResponse>(res);
        return data;
      })
      .then((data) => setData(data))
      .catch((e: Error) => {
        setError(e.message);
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [periodId, mode]);

  const minDebtNum = Math.max(0, parseFloat(minDebt) || 0);
  const qLower = (q ?? "").trim().toLowerCase();

  let rows: (PlotDebtRow | PersonDebtRow)[] = data?.items ?? [];

  // Status
  if (status === "debt>0") rows = rows.filter((r) => r.debtTotal > 0);
  else if (status === "debt=0") rows = rows.filter((r) => r.debtTotal === 0);
  else if (status === "credit<0") rows = rows.filter((r) => (r.accruedTotal - r.paidTotal) < 0);

  // Phone
  if (phone === "hasPhone") rows = rows.filter((r) => hasPhone(r.phone));
  else if (phone === "noPhone") rows = rows.filter((r) => !hasPhone(r.phone));

  // minDebt
  if (minDebtNum > 0) rows = rows.filter((r) => r.debtTotal >= minDebtNum);

  // Search
  if (qLower) {
    rows = rows.filter((r) => {
      const fn = (r.fullName ?? "").toLowerCase();
      const ph = (r.phone ?? "").toLowerCase();
      const pn = isPlotRow(r) ? (r.plotNumber ?? "").toLowerCase() : "";
      return fn.includes(qLower) || ph.includes(qLower) || pn.includes(qLower);
    });
  }

  // Sort
  const sortKey = sort === "plotNumber" && mode === "people" ? "plotCount" : sort;
  rows = [...rows].sort((a, b) => {
    let va: string | number;
    let vb: string | number;
    if (sortKey === "debtTotal") {
      va = a.debtTotal;
      vb = b.debtTotal;
    } else if (sortKey === "overdueDays") {
      va = a.overdueDays;
      vb = b.overdueDays;
    } else if (sortKey === "fullName") {
      va = (a.fullName ?? "").toLowerCase();
      vb = (b.fullName ?? "").toLowerCase();
    } else if (sortKey === "plotNumber" && isPlotRow(a) && isPlotRow(b)) {
      va = (a.plotNumber ?? "").toLowerCase();
      vb = (b.plotNumber ?? "").toLowerCase();
    } else if (sortKey === "plotCount" && !isPlotRow(a) && !isPlotRow(b)) {
      va = a.plotCount;
      vb = b.plotCount;
    } else {
      return 0;
    }
    const c = va < vb ? -1 : va > vb ? 1 : 0;
    return dir === "asc" ? c : -c;
  });

  const toggleSort = (key: SortKey) => {
    updateParams({
      sort: key,
      dir: sort === key && dir === "desc" ? "asc" : "desc",
    });
  };

  const formatAmount = (n: number) =>
    n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Totals from filtered rows
  const sumTotal = rows.reduce((s, r) => s + r.debtTotal, 0);
  const countWithDebt = rows.filter((r) => r.debtTotal > 0).length;
  const sumMembership = rows.reduce((s, r) => (isPlotRow(r) ? s + r.debtMembership : s), 0);
  const sumTarget = rows.reduce((s, r) => (isPlotRow(r) ? s + r.debtTarget : s), 0);
  const sumElectric = rows.reduce((s, r) => (isPlotRow(r) ? s + r.debtElectric : s), 0);

  const handleExportCSV = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    if (mode === "plots") {
      const header = "Участок,Улица,ФИО,Телефон,Долг,Начислено,Оплачено";
      const lines = rows.filter((r): r is PlotDebtRow => isPlotRow(r)).map((r) =>
        [esc(r.plotNumber), esc(r.street), esc(r.fullName), esc(r.phone), esc(r.debtTotal), esc(r.accruedTotal), esc(r.paidTotal)].join(",")
      );
      const csv = "\uFEFF" + header + "\n" + lines.join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "debts-plots.csv";
      a.click();
      URL.revokeObjectURL(a.href);
    } else {
      const header = "ФИО,Телефон,Кол-во участков,Долг,Начислено,Оплачено";
      const lines = rows.filter((r): r is PersonDebtRow => !isPlotRow(r)).map((r) =>
        [esc(r.fullName), esc(r.phone), esc(r.plotCount), esc(r.debtTotal), esc(r.accruedTotal), esc(r.paidTotal)].join(",")
      );
      const csv = "\uFEFF" + header + "\n" + lines.join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "debts-people.csv";
      a.click();
      URL.revokeObjectURL(a.href);
    }
  };

  const handleExportXLSX = async () => {
    let aoa: (string | number)[][];
    let name: string;
    if (mode === "plots") {
      aoa = [
        ["Участок", "Улица", "ФИО", "Телефон", "Долг", "Начислено", "Оплачено"],
        ...rows.filter((r): r is PlotDebtRow => isPlotRow(r)).map((r) =>
          [r.plotNumber, r.street, r.fullName, r.phone, r.debtTotal, r.accruedTotal, r.paidTotal]
        ),
      ];
      name = "debts-plots.xlsx";
    } else {
      aoa = [
        ["ФИО", "Телефон", "Кол-во участков", "Долг", "Начислено", "Оплачено"],
        ...rows.filter((r): r is PersonDebtRow => !isPlotRow(r)).map((r) =>
          [r.fullName, r.phone, r.plotCount, r.debtTotal, r.accruedTotal, r.paidTotal]
        ),
      ];
      name = "debts-people.xlsx";
    }
    const buffer = await buildXlsxFromArray(aoa, "Долги");
    downloadXlsx(buffer, name);
  };

  const statusLabel = (s: string) => {
    const l: Record<string, string> = { pending: "В ожидании", agreed: "Договорённость", in_progress: "В процессе", completed: "Завершён", cancelled: "Отменён" };
    return l[s] ?? s;
  };

  if (loading && !data) {
    return <div className="py-8 text-center text-zinc-600">Загрузка…</div>;
  }

  const periodList = periods ?? [];
  if (periodList.length === 0) {
    return (
      <div data-testid="debts-root">
        <EmptyStateCard
          title="Нет периодов начислений"
          description="Создайте период в разделе Начисления. После этого здесь появятся долги."
          actionLabel="Перейти в Начисления"
          actionHref="/admin/billing/accruals"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="debts-root">
      {/* Mode */}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4">
        <div data-testid="debts-mode" className="flex rounded-lg border border-zinc-200 p-0.5">
          <button
            type="button"
            onClick={() => updateParams({ mode: "plots" })}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${mode === "plots" ? "bg-[#5E704F] text-white" : "text-zinc-600 hover:bg-zinc-100"}`}
          >
            По участкам
          </button>
          <button
            type="button"
            onClick={() => updateParams({ mode: "people" })}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${mode === "people" ? "bg-[#5E704F] text-white" : "text-zinc-600 hover:bg-zinc-100"}`}
          >
            По людям
          </button>
        </div>

        <label className="flex flex-col gap-0.5" data-testid="debts-filter-period">
          <span className="text-xs font-medium text-zinc-500">Период</span>
          <select
            value={periodId ?? ""}
            onChange={(e) => updateParams({ periodId: e.target.value || null })}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            {periodList.map((p) => (
              <option key={p.id} value={p.id}>{p.from} — {p.to} {p.title ? `(${p.title})` : ""}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-0.5" data-testid="debts-filter-status">
          <span className="text-xs font-medium text-zinc-500">Статус</span>
          <select
            value={status}
            onChange={(e) => updateParams({ status: e.target.value })}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          >
            <option value="all">all</option>
            <option value="debt>0">debt &gt; 0</option>
            <option value="debt=0">debt = 0</option>
            <option value="credit<0">credit &lt; 0</option>
          </select>
        </label>

        <label className="flex flex-col gap-0.5" data-testid="debts-filter-phone">
          <span className="text-xs font-medium text-zinc-500">Телефон</span>
          <select
            value={phone}
            onChange={(e) => updateParams({ phone: e.target.value })}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          >
            <option value="all">all</option>
            <option value="hasPhone">hasPhone</option>
            <option value="noPhone">noPhone</option>
          </select>
        </label>

        <label className="flex flex-col gap-0.5" data-testid="debts-filter-minDebt">
          <span className="text-xs font-medium text-zinc-500">Порог (≥)</span>
          <input
            type="number"
            min={0}
            value={minDebt}
            onChange={(e) => updateParams({ minDebt: e.target.value || null })}
            className="w-24 rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </label>

        <label className="flex flex-col gap-0.5" data-testid="debts-filter-q">
          <span className="text-xs font-medium text-zinc-500">Поиск</span>
          <input
            type="text"
            value={q}
            onChange={(e) => updateParams({ q: e.target.value || null })}
            placeholder="ФИО, телефон, участок"
            className="min-w-[160px] rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </label>

        <div className="ml-auto flex items-center gap-2">
          <ExportButtons
            onExportCsv={handleExportCSV}
            onExportXlsx={handleExportXLSX}
            csvTestId="debts-export-csv"
            xlsxTestId="debts-export-xlsx"
          />
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
          >
            Печать
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-5">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="text-sm text-zinc-600">С долгом</div>
              <div className="text-2xl font-semibold text-zinc-900">{countWithDebt}</div>
            </div>
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <div className="text-sm text-blue-700">Членские</div>
              <div className="text-2xl font-semibold text-blue-900">{formatAmount(sumMembership)} ₽</div>
            </div>
            <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4">
              <div className="text-sm text-purple-700">Целевые</div>
              <div className="text-2xl font-semibold text-purple-900">{formatAmount(sumTarget)} ₽</div>
            </div>
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
              <div className="text-sm text-orange-700">Электро</div>
              <div className="text-2xl font-semibold text-orange-900">{formatAmount(sumElectric)} ₽</div>
            </div>
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <div className="text-sm text-red-700">Всего</div>
              <div className="text-2xl font-semibold text-red-900">{formatAmount(sumTotal)} ₽</div>
            </div>
          </div>

          {data.period && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm text-zinc-700">
              Период: {data.period.from} — {data.period.to} {data.period.title ? `(${data.period.title})` : ""}
            </div>
          )}
          {!data.period && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm text-zinc-700">
              Все периоды
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  {mode === "plots" && (
                    <>
                      <th className="px-4 py-2 text-left">
                        <button type="button" onClick={() => toggleSort("plotNumber")} className="font-semibold text-zinc-700 hover:text-zinc-900">
                          Участок {sort === "plotNumber" ? (dir === "asc" ? "↑" : "↓") : ""}
                        </button>
                      </th>
                      <th className="px-4 py-2 text-left font-semibold text-zinc-700">Улица</th>
                    </>
                  )}
                  {mode === "people" && (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => toggleSort("plotNumber")} className="font-semibold text-zinc-700 hover:text-zinc-900">
                        Участков {sort === "plotNumber" ? (dir === "asc" ? "↑" : "↓") : ""}
                      </button>
                    </th>
                  )}
                  <th className="px-4 py-2 text-left">
                    <button type="button" onClick={() => toggleSort("fullName")} className="font-semibold text-zinc-700 hover:text-zinc-900">
                      ФИО {sort === "fullName" ? (dir === "asc" ? "↑" : "↓") : ""}
                    </button>
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-zinc-700">Телефон</th>
                  <th className="px-4 py-2 text-right">
                    <button type="button" onClick={() => toggleSort("debtTotal")} className="font-semibold text-zinc-700 hover:text-zinc-900">
                      Долг {sort === "debtTotal" ? (dir === "asc" ? "↑" : "↓") : ""}
                    </button>
                  </th>
                  <th className="px-4 py-2 text-right">
                    <button type="button" onClick={() => toggleSort("overdueDays")} className="font-semibold text-zinc-700 hover:text-zinc-900">
                      Просрочка {sort === "overdueDays" ? (dir === "asc" ? "↑" : "↓") : ""}
                    </button>
                  </th>
                  {mode === "plots" && (
                    <>
                      <th className="px-4 py-2 text-right font-semibold text-zinc-700">Членские</th>
                      <th className="px-4 py-2 text-right font-semibold text-zinc-700">Целевые</th>
                      <th className="px-4 py-2 text-right font-semibold text-zinc-700">Электро</th>
                      <th className="px-4 py-2 text-left font-semibold text-zinc-700">План</th>
                      <th className="px-4 py-2 text-left font-semibold text-zinc-700">Действия</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={mode === "plots" ? 11 : 5} className="px-4 py-6">
                      <EmptyStateCard
                        title="Долгов нет"
                        description="По выбранным фильтрам записей не найдено. Попробуйте смягчить фильтры (период, статус, поиск) или выберите «All» по периоду."
                      />
                    </td>
                  </tr>
                ) : mode === "plots" ? (
                  rows.filter((r): r is PlotDebtRow => isPlotRow(r)).map((r) => (
                    <tr key={r.plotId} className="hover:bg-zinc-50">
                      <td className="px-4 py-2 text-zinc-700">{r.plotNumber}</td>
                      <td className="px-4 py-2 text-zinc-700">{r.street}</td>
                      <td className="px-4 py-2 text-zinc-800">{r.fullName}</td>
                      <td className="px-4 py-2 text-zinc-700">{r.phone || "—"}</td>
                      <td className="px-4 py-2 text-right font-semibold text-red-700">{formatAmount(r.debtTotal)} ₽</td>
                      <td className="px-4 py-2 text-right text-zinc-600">{r.overdueDays}</td>
                      <td className="px-4 py-2 text-right text-zinc-700">{formatAmount(r.debtMembership)}</td>
                      <td className="px-4 py-2 text-right text-zinc-700">{formatAmount(r.debtTarget)}</td>
                      <td className="px-4 py-2 text-right text-zinc-700">{formatAmount(r.debtElectric)}</td>
                      <td className="px-4 py-2 text-zinc-600">
                        {r.repaymentPlan ? statusLabel(r.repaymentPlan.status) : "—"}
                      </td>
                      <td className="px-4 py-2">
                        {periodId && (
                          <RepaymentPlanButton
                            plotId={r.plotId}
                            periodId={periodId}
                            existingPlan={r.repaymentPlan}
                            onUpdate={() => window.location.reload()}
                          />
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  rows.filter((r): r is PersonDebtRow => !isPlotRow(r)).map((r) => (
                    <tr key={r.personId} className="hover:bg-zinc-50">
                      <td className="px-4 py-2 text-zinc-700">{r.plotCount}</td>
                      <td className="px-4 py-2 text-zinc-800">{r.fullName}</td>
                      <td className="px-4 py-2 text-zinc-700">{r.phone || "—"}</td>
                      <td className="px-4 py-2 text-right font-semibold text-red-700">{formatAmount(r.debtTotal)} ₽</td>
                      <td className="px-4 py-2 text-right text-zinc-600">{r.overdueDays}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function RepaymentPlanButton({
  plotId,
  periodId,
  existingPlan,
  onUpdate,
}: {
  plotId: string;
  periodId: string;
  existingPlan?: { id: string; status: string; comment: string | null; agreedAmount: number | null; agreedDate: string | null } | null;
  onUpdate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(existingPlan?.status || "pending");
  const [comment, setComment] = useState(existingPlan?.comment || "");
  const [agreedAmount, setAgreedAmount] = useState(existingPlan?.agreedAmount?.toString() || "");
  const [agreedDate, setAgreedDate] = useState(existingPlan?.agreedDate || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/billing/debts/repayment-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plotId, periodId, status, comment: comment || null, agreedAmount: agreedAmount ? Number(agreedAmount) : null, agreedDate: agreedDate || null }),
      });
      await readOk(res);
      setOpen(false);
      onUpdate();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-[#5E704F] hover:underline text-sm">
        {existingPlan ? "Изменить" : "Добавить"}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-zinc-900 mb-4">План погашения</h3>
        <div className="space-y-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-zinc-800">Статус</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded border border-zinc-300 px-3 py-2" required>
              <option value="pending">В ожидании</option>
              <option value="agreed">Договорённость</option>
              <option value="in_progress">В процессе</option>
              <option value="completed">Завершён</option>
              <option value="cancelled">Отменён</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-zinc-800">Комментарий</span>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} className="rounded border border-zinc-300 px-3 py-2" rows={3} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-zinc-800">Договорённая сумма</span>
            <input type="number" value={agreedAmount} onChange={(e) => setAgreedAmount(e.target.value)} className="rounded border border-zinc-300 px-3 py-2" step="0.01" min={0} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-zinc-800">Договорённая дата</span>
            <input type="date" value={agreedDate} onChange={(e) => setAgreedDate(e.target.value)} className="rounded border border-zinc-300 px-3 py-2" />
          </label>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => { setOpen(false); setStatus(existingPlan?.status || "pending"); setComment(existingPlan?.comment || ""); setAgreedAmount(existingPlan?.agreedAmount?.toString() || ""); setAgreedDate(existingPlan?.agreedDate || ""); }} className="rounded border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-100">Отмена</button>
            <button type="button" onClick={handleSave} disabled={saving} className="rounded bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4d5d41] disabled:opacity-50">{saving ? "Сохранение…" : "Сохранить"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
