"use client";

import { useState, useEffect } from "react";
import { readOk } from "@/lib/api/client";

type DebtorByPerson = {
  personKey: string;
  fullName: string;
  plotCount: number;
  debtTotal: number;
  overdueDays: number;
  phone?: string | null;
  email?: string | null;
};

type ByPersonResponse = {
  items: DebtorByPerson[];
  period: { id: string; from: string; to: string; title: string | null } | null;
};

type MessageTemplate = { id: string; title: string; message: string };
type TemplatesResponse = { templates: MessageTemplate[] };

type Period = { id: string; from: string; to: string; title?: string | null };
type PeriodsResponse = { periods: Period[] };

type MailingRow = { fullName: string; phone: string; debtTotal: number; text: string };
type MailingResponse = { rows: MailingRow[]; period: { id: string; from: string; to: string; title?: string | null } | null };

type Segment = "all" | "has_phone" | "no_phone" | "overdue" | "large_debt";

function applySegment(
  items: DebtorByPerson[],
  segment: Segment,
  overdueN: number,
  debtThreshold: number
): DebtorByPerson[] {
  switch (segment) {
    case "all":
      return items;
    case "has_phone":
      return items.filter((i) => (i.phone ?? "").trim().length > 0 && (i.phone ?? "").trim() !== "—");
    case "no_phone":
      return items.filter((i) => !(i.phone ?? "").trim() || (i.phone ?? "").trim() === "—");
    case "overdue":
      return items.filter((i) => i.debtTotal > 0 && i.overdueDays > overdueN);
    case "large_debt":
      return items.filter((i) => i.debtTotal >= debtThreshold);
    default:
      return items;
  }
}

export default function DebtorsClient() {
  const [items, setItems] = useState<DebtorByPerson[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [segment, setSegment] = useState<Segment>("all");
  const [overdueN, setOverdueN] = useState<string>("30");
  const [debtThreshold, setDebtThreshold] = useState<string>("50000");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mailingOpen, setMailingOpen] = useState(false);
  const [mailingRows, setMailingRows] = useState<MailingRow[] | null>(null);
  const [mailingGenerating, setMailingGenerating] = useState(false);

  useEffect(() => {
    void loadPeriods();
    void loadTemplates();
  }, []);

  useEffect(() => {
    void loadDebtors();
  }, [periodId]);

  const loadPeriods = async () => {
    try {
      const res = await fetch("/api/admin/billing/periods", { cache: "no-store" });
      const { periods } = await readOk<PeriodsResponse>(res);
      setPeriods(periods ?? []);
    } catch {
      setPeriods([]);
    }
  };

  const loadTemplates = async () => {
    try {
      const res = await fetch("/api/admin/billing/notifications/templates", { cache: "no-store" });
      const { templates } = await readOk<TemplatesResponse>(res);
      setTemplates(templates ?? []);
    } catch {
      setTemplates([]);
    }
  };

  const loadDebtors = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (periodId) params.set("periodId", periodId);
      const res = await fetch(`/api/admin/billing/debtors/by-person?${params}`, { cache: "no-store" });
      const { items } = await readOk<ByPersonResponse>(res);
      setItems(items ?? []);
    } catch (e) {
      setError((e as Error).message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const overdueNum = Math.max(0, parseInt(overdueN, 10) || 0);
  const thresholdNum = Math.max(0, parseFloat(debtThreshold) || 0);
  const filtered = applySegment(items, segment, overdueNum, thresholdNum);

  const formatAmount = (n: number) =>
    n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-4" data-testid="debtors-root">
      {/* Фильтры: период, сегмент, пороги */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-zinc-800">Период</span>
            <select
              value={periodId ?? ""}
              onChange={(e) => setPeriodId(e.target.value || null)}
              className="rounded border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="">Все периоды</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.from} — {p.to} {p.title ? `(${p.title})` : ""}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-1" data-testid="debtors-segment">
            <span className="text-sm font-semibold text-zinc-800">Сегмент</span>
            <select
              value={segment}
              onChange={(e) => setSegment(e.target.value as Segment)}
              className="rounded border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="all">Все должники</option>
              <option value="has_phone">Есть телефон</option>
              <option value="no_phone">Нет телефона</option>
              <option value="overdue">Долг &gt; 0 и просрочка &gt; N дней</option>
              <option value="large_debt">Крупные долги</option>
            </select>
          </div>

          {(segment === "overdue" || segment === "large_debt") && (
            <div className="flex flex-col gap-1" data-testid="debtors-threshold">
              <span className="text-sm font-semibold text-zinc-800">
                {segment === "overdue" ? "N (дней просрочки)" : "Порог (₽)"}
              </span>
              <input
                type="number"
                min={0}
                value={segment === "overdue" ? overdueN : debtThreshold}
                onChange={(e) =>
                  segment === "overdue" ? setOverdueN(e.target.value) : setDebtThreshold(e.target.value)
                }
                className="w-32 rounded border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
          )}

          <button
            type="button"
            data-testid="debtors-generate-mailing"
            onClick={() => {
              setMailingRows(null);
              setMailingOpen(true);
            }}
            className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4d5d41]"
          >
            Сформировать рассылку
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {error}
        </div>
      )}

      {/* Таблица */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">ФИО</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Телефон</th>
              <th className="px-4 py-3 text-right font-semibold text-zinc-700">Кол-во участков</th>
              <th className="px-4 py-3 text-right font-semibold text-zinc-700">Долг итого</th>
              <th className="px-4 py-3 text-right font-semibold text-zinc-700">Просрочка (дней)</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  Загрузка…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  Нет должников
                </td>
              </tr>
            ) : (
              filtered.map((i) => (
                <tr key={i.personKey} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 font-medium text-zinc-900">{i.fullName || "—"}</td>
                  <td className="px-4 py-3 text-zinc-700">{(i.phone ?? "").trim() || "—"}</td>
                  <td className="px-4 py-3 text-right text-zinc-700">{i.plotCount}</td>
                  <td className="px-4 py-3 text-right font-semibold text-red-700">
                    {formatAmount(i.debtTotal)} ₽
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-700">{i.overdueDays}</td>
                  <td className="px-4 py-3 text-zinc-500">—</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {mailingOpen && (
        <MailingModal
          templates={templates}
          periods={periods}
          onClose={() => {
            setMailingOpen(false);
            setMailingRows(null);
          }}
          initialRows={mailingRows}
          onGenerated={setMailingRows}
          generating={mailingGenerating}
          onGeneratingChange={setMailingGenerating}
        />
      )}
    </div>
  );
}

function MailingModal({
  templates,
  periods,
  onClose,
  initialRows,
  onGenerated,
  generating,
  onGeneratingChange,
}: {
  templates: MessageTemplate[];
  periods: Period[];
  onClose: () => void;
  initialRows: MailingRow[] | null;
  onGenerated: (r: MailingRow[] | null) => void;
  generating: boolean;
  onGeneratingChange: (v: boolean) => void;
}) {
  const [templateId, setTemplateId] = useState("");
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [rows, setRows] = useState<MailingRow[] | null>(initialRows);

  const formatAmount = (n: number) =>
    n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleGenerate = async () => {
    if (!templateId) {
      alert("Выберите шаблон");
      return;
    }
    onGeneratingChange(true);
    try {
      const res = await fetch("/api/admin/billing/notifications/mailing-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, periodId }),
      });
      const data = await readOk<MailingResponse>(res);
      setRows(data.rows ?? []);
      onGenerated(data.rows ?? []);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      onGeneratingChange(false);
    }
  };

  const handleExportCsv = () => {
    if (!rows || rows.length === 0) return;
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const header = "ФИО,телефон,долг,текст";
    const lines = rows.map((r) =>
      [esc(r.fullName), esc(r.phone), esc(r.debtTotal), esc(r.text)].join(",")
    );
    const csv = "\uFEFF" + header + "\n" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "mailing-list.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const displayRows = rows ?? initialRows;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-zinc-900">Сформировать рассылку</h3>
        <p className="mt-1 text-sm text-zinc-600">
          Выберите шаблон и период. Период «Все периоды» — по умолчанию берётся сводный список.
        </p>

        <div className="mt-4 flex flex-wrap gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-zinc-700">Шаблон</span>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="rounded border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-zinc-700">Период</span>
            <select
              value={periodId ?? ""}
              onChange={(e) => setPeriodId(e.target.value || null)}
              className="rounded border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="">Все периоды</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.from} — {p.to} {p.title ? `(${p.title})` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !templateId}
            className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4d5d41] disabled:bg-zinc-300 disabled:cursor-not-allowed"
          >
            {generating ? "…" : "Сгенерировать"}
          </button>
          {displayRows && displayRows.length > 0 && (
            <button
              type="button"
              data-testid="debtors-export"
              onClick={handleExportCsv}
              className="rounded border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            >
              Экспорт CSV
            </button>
          )}
        </div>

        {displayRows && (
          <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
            Строк в рассылке: <strong>{displayRows.length}</strong>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
