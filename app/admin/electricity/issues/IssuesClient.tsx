"use client";

import { useEffect, useState } from "react";
import { readOk } from "@/lib/api/client";
type IssueType = "missing_readings" | "no_previous" | "negative_consumption" | "anomaly_spike";

export interface ElectricityIssue {
  type: IssueType;
  plotId: string;
  meterId: string;
  meterNumber?: string | null;
  street?: string;
  plotNumber?: string;
  ownerFullName?: string | null;
  description: string;
  details?: {
    lastReadingDate?: string | null;
    lastReadingValue?: number | null;
    currentReadingDate?: string | null;
    currentReadingValue?: number | null;
    consumption?: number | null;
    period?: string;
  };
}

export default function IssuesClient() {
  const now = new Date();
  const [year, setYear] = useState<string>(now.getFullYear().toString());
  const [month, setMonth] = useState<string>((now.getMonth() + 1).toString());
  const [issueType, setIssueType] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<ElectricityIssue[]>([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("year", year);
      params.set("month", month);
      if (issueType) params.set("type", issueType);

      const res = await fetch(`/api/admin/electricity/issues?${params.toString()}`, { cache: "no-store" });
      const data = await readOk<{ issues: ElectricityIssue[] }>(res);
      setIssues(data.issues ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportCsv = () => {
    const params = new URLSearchParams();
    params.set("year", year);
    params.set("month", month);
    if (issueType) params.set("type", issueType);
    window.location.href = `/api/admin/electricity/issues/export.csv?${params.toString()}`;
  };

  const getIssueTypeLabel = (type: ElectricityIssue["type"]) => {
    switch (type) {
      case "missing_readings":
        return "Пропуски показаний";
      case "no_previous":
        return "Нет предыдущих";
      case "negative_consumption":
        return "Отрицательное потребление";
      case "anomaly_spike":
        return "Аномальный скачок";
      default:
        return type;
    }
  };

  const getIssueTypeBadge = (type: ElectricityIssue["type"]) => {
    const baseClasses = "rounded-full px-2 py-0.5 text-xs font-semibold";
    switch (type) {
      case "missing_readings":
        return <span className={`${baseClasses} bg-amber-100 text-amber-800`}>Пропуски</span>;
      case "no_previous":
        return <span className={`${baseClasses} bg-blue-100 text-blue-800`}>Нет предыдущих</span>;
      case "negative_consumption":
        return <span className={`${baseClasses} bg-red-100 text-red-800`}>Отрицательное</span>;
      case "anomaly_spike":
        return <span className={`${baseClasses} bg-purple-100 text-purple-800`}>Скачок</span>;
      default:
        return <span className={`${baseClasses} bg-zinc-100 text-zinc-800`}>{type}</span>;
    }
  };

  const issuesByType = issues.reduce(
    (acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    },
    {} as Record<ElectricityIssue["type"], number>
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <label className="text-sm text-zinc-700">
          Год
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="mt-1 w-28 rounded border border-zinc-300 px-2 py-1"
          />
        </label>
        <label className="text-sm text-zinc-700">
          Месяц
          <input
            type="number"
            min={1}
            max={12}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="mt-1 w-20 rounded border border-zinc-300 px-2 py-1"
          />
        </label>
        <label className="text-sm text-zinc-700">
          Тип проблемы
          <select
            value={issueType}
            onChange={(e) => setIssueType(e.target.value)}
            className="mt-1 rounded border border-zinc-300 px-2 py-1"
          >
            <option value="">Все</option>
            <option value="missing_readings">Пропуски показаний</option>
            <option value="no_previous">Нет предыдущих</option>
            <option value="negative_consumption">Отрицательное потребление</option>
            <option value="anomaly_spike">Аномальный скачок</option>
          </select>
        </label>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4f5f42] disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          Показать
        </button>
        <button
          type="button"
          onClick={exportCsv}
          disabled={issues.length === 0}
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-50"
        >
          Экспорт CSV
        </button>
        {loading && <span className="text-sm text-zinc-600">Загрузка...</span>}
      </div>

      {/* Summary */}
      {Object.keys(issuesByType).length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-zinc-900 mb-2">Сводка по типам проблем:</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(issuesByType).map(([type, count]) => (
              <div key={type} className="rounded bg-zinc-50 px-3 py-1 text-sm">
                {getIssueTypeLabel(type as ElectricityIssue["type"])}: {count}
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Тип</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Участок</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Владелец</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">№ счётчика</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Описание</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Детали</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {issues.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-zinc-500" colSpan={6}>
                  {loading ? "Загрузка..." : "Проблем не найдено"}
                </td>
              </tr>
            ) : (
              issues.map((issue, idx) => (
                <tr key={`${issue.meterId}-${issue.type}-${idx}`} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">{getIssueTypeBadge(issue.type)}</td>
                  <td className="px-4 py-3 text-zinc-900">
                    {issue.street ? `${issue.street}, ${issue.plotNumber}` : issue.plotNumber || "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{issue.ownerFullName || "—"}</td>
                  <td className="px-4 py-3 text-zinc-700">{issue.meterNumber || "—"}</td>
                  <td className="px-4 py-3 text-zinc-700">{issue.description}</td>
                  <td className="px-4 py-3 text-zinc-600 text-xs">
                    {issue.details?.lastReadingDate && (
                      <div>
                        Предыдущее: {new Date(issue.details.lastReadingDate).toLocaleDateString("ru-RU")} (
                        {issue.details.lastReadingValue})
                      </div>
                    )}
                    {issue.details?.currentReadingDate && (
                      <div>
                        Текущее: {new Date(issue.details.currentReadingDate).toLocaleDateString("ru-RU")} (
                        {issue.details.currentReadingValue})
                      </div>
                    )}
                    {issue.details?.consumption !== null && issue.details?.consumption !== undefined && (
                      <div>Потребление: {issue.details.consumption.toFixed(2)} кВт·ч</div>
                    )}
                    {issue.details?.period && <div>Период: {issue.details.period}</div>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
