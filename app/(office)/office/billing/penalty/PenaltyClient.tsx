"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiPost, apiGet, ApiError } from "@/lib/api/client";
import OfficeLoadingState from "../../_components/OfficeLoadingState";
import OfficeErrorState from "../../_components/OfficeErrorState";
import OfficeEmptyState from "../../_components/OfficeEmptyState";

type PenaltyPreviewRow = {
  plotId: string;
  plotLabel: string;
  period: string;
  originalAmount: number;
  remaining: number;
  daysOverdue: number;
  penaltyAmount: number;
  date: string;
};

type PreviewResponse = {
  rows: PenaltyPreviewRow[];
  summary: {
    totalPenalty: number;
    affectedPlots: number;
    rowCount: number;
    asOf: string;
    rate: number;
  };
};

type ApplyResponse = {
  createdCount: number;
  totalPenalty: number;
  period: string;
  charges: Array<{ plotId: string; plotLabel: string; amount: number }>;
};

type RecalcResponse = {
  results: {
    updated: number;
    created: number;
    skippedFrozen: number;
    skippedVoided: number;
    skippedZeroDebt: number;
    sample: Array<{
      plotId: string;
      plotLabel: string;
      oldAmount: number;
      newAmount: number;
      action: string;
    }>;
  };
  summary: {
    processed: number;
    updated: number;
    created: number;
    skipped: number;
    frozen: number;
    voided: number;
    zeroDebt: number;
  };
  config: {
    asOf: string;
    rate: number;
    period: string;
    policyVersion: string;
  };
};

type PenaltyAccrualStatus = "active" | "voided" | "frozen";

type PenaltyAccrual = {
  id: string;
  plotId: string;
  plotLabel: string;
  period: string;
  amount: number;
  status: PenaltyAccrualStatus;
  metadata: {
    asOf: string;
    ratePerDay: number;
    baseDebt: number;
    daysOverdue: number;
    policyVersion: string;
  };
  voidedBy: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  frozenBy: string | null;
  frozenAt: string | null;
  freezeReason: string | null;
  createdAt: string;
};

type AccrualsResponse = {
  accruals: PenaltyAccrual[];
  summary: {
    total: number;
    active: number;
    frozen: number;
    voided: number;
    totalAmount: number;
    activeAmount: number;
  };
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });

const STATUS_LABELS: Record<PenaltyAccrualStatus, string> = {
  active: "Активно",
  frozen: "Заморожено",
  voided: "Аннулировано",
};

const STATUS_COLORS: Record<PenaltyAccrualStatus, string> = {
  active: "bg-emerald-100 text-emerald-800",
  frozen: "bg-blue-100 text-blue-800",
  voided: "bg-zinc-100 text-zinc-500",
};

export default function PenaltyClient() {
  const router = useRouter();
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));
  const [rate, setRate] = useState(0.1);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [recalcing, setRecalcing] = useState(false);
  const [reason, setReason] = useState("");
  const [showReason, setShowReason] = useState(false);
  const [pendingAction, setPendingAction] = useState<"apply" | "recalc" | null>(null);

  // Accruals list state
  const [accruals, setAccruals] = useState<PenaltyAccrual[]>([]);
  const [accrualsSummary, setAccrualsSummary] = useState<AccrualsResponse["summary"] | null>(null);
  const [loadingAccruals, setLoadingAccruals] = useState(true);
  const [statusFilter, setStatusFilter] = useState<PenaltyAccrualStatus | "all">("all");

  // Modal state
  const [selectedAccrual, setSelectedAccrual] = useState<PenaltyAccrual | null>(null);
  const [actionModal, setActionModal] = useState<"void" | "freeze" | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadAccruals = useCallback(async () => {
    setLoadingAccruals(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      const result = await apiGet<AccrualsResponse>(`/api/office/billing/penalty/accruals?${params.toString()}`);
      setAccruals(result.accruals);
      setAccrualsSummary(result.summary);
    } catch (err) {
      console.error("Failed to load accruals:", err);
    } finally {
      setLoadingAccruals(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadAccruals();
  }, [loadAccruals]);

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const period = asOf.slice(0, 7);
        const data = await apiGet<{ status: "open" | "closed" }>(
          `/api/office/billing/period-close?period=${period}`,
        );
        if (!active) return;
        setShowReason(data.status === "closed");
      } catch {
        if (!active) return;
      }
    };
    void check();
    return () => {
      active = false;
    };
  }, [asOf]);

  const handlePreview = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setPreview(null);
    try {
      const result = await apiPost<PreviewResponse>("/api/office/billing/penalty/preview", {
        asOf,
        rate,
      });
      setPreview(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка предпросмотра");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!preview) return;
    setApplying(true);
    setError(null);
    setSuccess(null);
    setPendingAction("apply");
    try {
      const result = await apiPost<ApplyResponse>("/api/office/billing/penalty/apply", {
        asOf,
        rate,
        reason: showReason && reason.trim() ? reason.trim() : undefined,
      });
      setSuccess(`Создано ${result.createdCount} начислений на сумму ${formatCurrency(result.totalPenalty)}`);
      setPreview(null);
      await loadAccruals();
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && (err.code === "period_closed" || err.status === 409)) {
        setShowReason(true);
      }
      setError(err instanceof Error ? err.message : "Ошибка создания начислений");
    } finally {
      setApplying(false);
    }
  };

  const handleRecalc = async () => {
    setRecalcing(true);
    setError(null);
    setSuccess(null);
    setPendingAction("recalc");
    try {
      const result = await apiPost<RecalcResponse>("/api/office/billing/penalty/recalc", {
        asOf,
        rate,
        reason: showReason && reason.trim() ? reason.trim() : undefined,
      });
      const { summary } = result;
      setSuccess(
        `Пересчёт завершён: обновлено ${summary.updated}, создано ${summary.created}, ` +
        `пропущено ${summary.skipped} (заморожено: ${summary.frozen}, аннулировано: ${summary.voided})`
      );
      await loadAccruals();
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && (err.code === "period_closed" || err.status === 409)) {
        setShowReason(true);
      }
      setError(err instanceof Error ? err.message : "Ошибка пересчёта пени");
    } finally {
      setRecalcing(false);
    }
  };

  const retryWithReason = () => {
    if (pendingAction === "apply") {
      void handleApply();
    } else if (pendingAction === "recalc") {
      void handleRecalc();
    }
  };

  const handleVoid = async () => {
    if (!selectedAccrual || !actionReason.trim()) return;
    setActionLoading(true);
    try {
      await apiPost("/api/office/billing/penalty/void", {
        penaltyAccrualId: selectedAccrual.id,
        reason: actionReason.trim(),
      });
      setActionModal(null);
      setSelectedAccrual(null);
      setActionReason("");
      setSuccess("Начисление пени аннулировано");
      await loadAccruals();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка аннулирования");
    } finally {
      setActionLoading(false);
    }
  };

  const handleFreeze = async () => {
    if (!selectedAccrual || !actionReason.trim()) return;
    setActionLoading(true);
    try {
      await apiPost("/api/office/billing/penalty/freeze", {
        penaltyAccrualId: selectedAccrual.id,
        reason: actionReason.trim(),
      });
      setActionModal(null);
      setSelectedAccrual(null);
      setActionReason("");
      setSuccess("Начисление пени заморожено");
      await loadAccruals();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка заморозки");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnfreeze = async (accrual: PenaltyAccrual) => {
    try {
      await apiPost("/api/office/billing/penalty/unfreeze", { id: accrual.id });
      setSuccess("Начисление пени разморожено");
      await loadAccruals();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка разморозки");
    }
  };

  const openVoidModal = (accrual: PenaltyAccrual) => {
    setSelectedAccrual(accrual);
    setActionModal("void");
    setActionReason("");
  };

  const openFreezeModal = (accrual: PenaltyAccrual) => {
    setSelectedAccrual(accrual);
    setActionModal("freeze");
    setActionReason("");
  };

  return (
    <div className="space-y-4" data-testid="office-penalty-client">
      {/* Controls */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-zinc-800">Дата расчёта</label>
            <input
              type="date"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:border-[#5E704F] focus:outline-none"
              data-testid="office-penalty-date"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-zinc-800">Ставка (% годовых)</label>
            <input
              type="number"
              value={rate * 100}
              onChange={(e) => setRate(Number(e.target.value) / 100)}
              step="0.1"
              min="0"
              max="100"
              className="w-24 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:border-[#5E704F] focus:outline-none"
              data-testid="office-penalty-rate"
            />
          </div>
          <button
            type="button"
            onClick={handlePreview}
            disabled={loading}
            className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-700 disabled:opacity-50"
            data-testid="office-penalty-preview"
          >
            {loading ? "Загрузка..." : "Рассчитать"}
          </button>
          <button
            type="button"
            onClick={handleRecalc}
            disabled={recalcing}
            className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 shadow-sm transition hover:bg-amber-100 disabled:opacity-50"
            data-testid="office-penalty-recalc"
          >
            {recalcing ? "Пересчёт..." : "Пересчёт существующих"}
          </button>
        </div>
        {showReason && (
          <div className="mt-3">
            <label className="block text-sm font-semibold text-zinc-700">
              Причина изменения (если период закрыт)
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                data-testid="office-reason-input"
              />
            </label>
            <button
              type="button"
              onClick={retryWithReason}
              className="mt-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700"
              data-testid="office-reason-submit-retry"
            >
              Повторить с причиной
            </button>
          </div>
        )}
      </div>

      {/* States */}
      {loading && <OfficeLoadingState message="Расчёт пени..." testId="office-penalty-loading" />}
      {error && <OfficeErrorState message={error} onRetry={handlePreview} testId="office-penalty-error" />}
      {success && (
        <div
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          data-testid="office-penalty-success"
        >
          {success}
        </div>
      )}

      {/* Preview Table */}
      {preview && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">Предпросмотр пени</h2>
              <p className="text-sm text-zinc-600">
                Участков: {preview.summary.affectedPlots}, Всего: {formatCurrency(preview.summary.totalPenalty)}
              </p>
            </div>
            <button
              type="button"
              onClick={handleApply}
              disabled={applying || preview.rows.length === 0}
              className="rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4d5d41] disabled:opacity-50"
              data-testid="office-penalty-apply"
            >
              {applying ? "Создание..." : "Создать начисления пени"}
            </button>
          </div>

          {preview.rows.length === 0 ? (
            <OfficeEmptyState message="Нет долгов для начисления пени." testId="office-penalty-empty" />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-sm">
                <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Участок</th>
                    <th className="px-3 py-2 text-left">Период</th>
                    <th className="px-3 py-2 text-right">Долг</th>
                    <th className="px-3 py-2 text-right">Дни просрочки</th>
                    <th className="px-3 py-2 text-right">Пени</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {preview.rows.map((row, idx) => (
                    <tr key={`${row.plotId}-${row.period}-${idx}`} data-testid={`office-penalty-row-${idx}`}>
                      <td className="px-3 py-2 text-zinc-900">{row.plotLabel}</td>
                      <td className="px-3 py-2 text-zinc-700">{row.period}</td>
                      <td className="px-3 py-2 text-right text-zinc-700">{formatCurrency(row.remaining)}</td>
                      <td className="px-3 py-2 text-right text-zinc-700">{row.daysOverdue}</td>
                      <td className="px-3 py-2 text-right font-semibold text-zinc-900">
                        {formatCurrency(row.penaltyAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Existing Accruals */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Начисления пени</h2>
            {accrualsSummary && (
              <p className="text-sm text-zinc-600">
                Всего: {accrualsSummary.total} | Активных: {accrualsSummary.active} |
                Сумма: {formatCurrency(accrualsSummary.activeAmount)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PenaltyAccrualStatus | "all")}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
              data-testid="office-penalty-status-filter"
            >
              <option value="all">Все статусы</option>
              <option value="active">Активные</option>
              <option value="frozen">Замороженные</option>
              <option value="voided">Аннулированные</option>
            </select>
            <button
              type="button"
              onClick={loadAccruals}
              disabled={loadingAccruals}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:border-zinc-300"
            >
              Обновить
            </button>
          </div>
        </div>

        {loadingAccruals ? (
          <OfficeLoadingState message="Загрузка начислений..." testId="office-penalty-accruals-loading" />
        ) : accruals.length === 0 ? (
          <OfficeEmptyState message="Нет начислений пени." testId="office-penalty-accruals-empty" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                <tr>
                  <th className="px-3 py-2 text-left">Участок</th>
                  <th className="px-3 py-2 text-left">Период</th>
                  <th className="px-3 py-2 text-right">Сумма</th>
                  <th className="px-3 py-2 text-left">Статус</th>
                  <th className="px-3 py-2 text-left">Метаданные</th>
                  <th className="px-3 py-2 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {accruals.map((accrual) => (
                  <tr key={accrual.id} data-testid={`office-penalty-accrual-${accrual.id}`}>
                    <td className="px-3 py-2 text-zinc-900">{accrual.plotLabel}</td>
                    <td className="px-3 py-2 text-zinc-700">{accrual.period}</td>
                    <td className="px-3 py-2 text-right font-semibold text-zinc-900">
                      {formatCurrency(accrual.amount)}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[accrual.status]}`}>
                        {STATUS_LABELS[accrual.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="group relative cursor-help">
                        <span className="text-xs text-zinc-500">
                          {formatDate(accrual.metadata.asOf)} · {accrual.metadata.daysOverdue} дн.
                        </span>
                        <div className="absolute left-0 top-full z-10 mt-1 hidden w-64 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg group-hover:block">
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Дата расчёта:</span>
                              <span className="font-medium">{formatDate(accrual.metadata.asOf)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-500">База долга:</span>
                              <span className="font-medium">{formatCurrency(accrual.metadata.baseDebt)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Дней просрочки:</span>
                              <span className="font-medium">{accrual.metadata.daysOverdue}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Ставка/день:</span>
                              <span className="font-medium">{(accrual.metadata.ratePerDay * 100).toFixed(4)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Версия политики:</span>
                              <span className="font-medium">{accrual.metadata.policyVersion}</span>
                            </div>
                            {accrual.freezeReason && (
                              <div className="mt-2 border-t border-zinc-100 pt-2">
                                <span className="text-blue-600">Причина заморозки:</span>
                                <p className="mt-0.5 text-zinc-700">{accrual.freezeReason}</p>
                              </div>
                            )}
                            {accrual.voidReason && (
                              <div className="mt-2 border-t border-zinc-100 pt-2">
                                <span className="text-rose-600">Причина аннулирования:</span>
                                <p className="mt-0.5 text-zinc-700">{accrual.voidReason}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {accrual.status === "active" && (
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openVoidModal(accrual)}
                            className="rounded px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                            data-testid={`office-penalty-void-${accrual.id}`}
                          >
                            Аннулировать
                          </button>
                          <button
                            type="button"
                            onClick={() => openFreezeModal(accrual)}
                            className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                            data-testid={`office-penalty-freeze-${accrual.id}`}
                          >
                            Заморозить
                          </button>
                        </div>
                      )}
                      {accrual.status === "frozen" && (
                        <button
                          type="button"
                          onClick={() => handleUnfreeze(accrual)}
                          className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                        >
                          Разморозить
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Void/Freeze Modal */}
      {actionModal && selectedAccrual && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setActionModal(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-zinc-900">
              {actionModal === "void" ? "Аннулировать пени" : "Заморозить пени"}
            </h3>
            <p className="mt-1 text-sm text-zinc-600">
              {actionModal === "void"
                ? "Аннулированные пени не будут учитываться в долге."
                : "Замороженные пени не будут пересчитываться."}
            </p>
            <div className="mt-4 rounded-lg bg-zinc-50 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Участок:</span>
                <span className="font-medium">{selectedAccrual.plotLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Сумма:</span>
                <span className="font-medium">{formatCurrency(selectedAccrual.amount)}</span>
              </div>
            </div>
            <div className="mt-4">
              <label className="mb-1 block text-sm font-semibold text-zinc-800">
                Причина <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Укажите причину..."
                rows={3}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[#5E704F] focus:outline-none"
                data-testid="office-reason-input"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={actionModal === "void" ? handleVoid : handleFreeze}
                disabled={actionLoading || !actionReason.trim()}
                className={`rounded-full px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50 ${
                  actionModal === "void"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
                data-testid={`office-penalty-${actionModal}-confirm`}
              >
                {actionLoading ? "Обработка..." : actionModal === "void" ? "Аннулировать" : "Заморозить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
