"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { DataIssue, DataIssueType, IssueSummary } from "@/lib/registry/core/issues.store";
import IssueFixModal from "./IssueFixModal";
import { readOk } from "@/lib/api/client";

const issueTypeLabels: Record<DataIssueType, string> = {
  empty_fullname: "Пустое ФИО",
  empty_phone: "Пустой телефон",
  empty_plots: "Нет участков",
  duplicate_phone: "Дубликат телефона",
  name_conflict: "Конфликт ФИО",
};

const severityLabels: Record<"low" | "medium" | "high", string> = {
  low: "Низкая",
  medium: "Средняя",
  high: "Высокая",
};

const severityColors: Record<"low" | "medium" | "high", string> = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-red-100 text-red-800",
};

export default function RegistryIssuesTab() {
  const [issues, setIssues] = useState<DataIssue[]>([]);
  const [summary, setSummary] = useState<IssueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<DataIssue | null>(null);
  const [filterType, setFilterType] = useState<DataIssueType | "">("");
  const [filterSeverity, setFilterSeverity] = useState<"low" | "medium" | "high" | "">("");

  useEffect(() => {
    loadIssues();
  }, [filterType, filterSeverity]);

  const loadIssues = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterType) params.set("type", filterType);
      if (filterSeverity) params.set("severity", filterSeverity);

      const res = await fetch(`/api/admin/registry/issues?${params.toString()}`);
      const data = await readOk<{ issues?: DataIssue[]; summary?: IssueSummary }>(res);
      setIssues(data.issues || []);
      setSummary(data.summary || null);
    } catch (e) {
      setError((e as Error).message || "Ошибка загрузки проблем");
    } finally {
      setLoading(false);
    }
  };

  const handleIssueFixed = () => {
    setSelectedIssue(null);
    loadIssues();
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (filterType) params.set("type", filterType);
    if (filterSeverity) params.set("severity", filterSeverity);
    window.open(`/api/admin/registry/issues/export.csv?${params.toString()}`, "_blank");
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-zinc-600">Загрузка...</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Проблемы данных</h2>
          <p className="text-sm text-zinc-600">Обнаружение и исправление проблем качества данных</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            Экспорт CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {error}
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-zinc-500">Всего проблем</div>
            <div className="text-2xl font-semibold">{summary.total}</div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-zinc-500">Высокая важность</div>
            <div className="text-2xl font-semibold text-red-600">{summary.bySeverity.high}</div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-zinc-500">Средняя важность</div>
            <div className="text-2xl font-semibold text-amber-600">{summary.bySeverity.medium}</div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-zinc-500">Низкая важность</div>
            <div className="text-2xl font-semibold text-blue-600">{summary.bySeverity.low}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as DataIssueType | "")}
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="">Все типы</option>
          {Object.entries(issueTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value as typeof filterSeverity)}
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="">Все важности</option>
          {Object.entries(severityLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {(filterType || filterSeverity) && (
          <button
            type="button"
            onClick={() => {
              setFilterType("");
              setFilterSeverity("");
            }}
            className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400"
          >
            Сбросить
          </button>
        )}
      </div>

      {/* Issues Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Тип</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Важность</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Описание</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">ФИО</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Телефон</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {issues.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  Проблем не найдено
                </td>
              </tr>
            ) : (
              issues.map((issue) => (
                <tr key={issue.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-zinc-900">{issueTypeLabels[issue.type]}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${severityColors[issue.severity]}`}
                    >
                      {severityLabels[issue.severity]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{issue.description}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/registry/people/${issue.personId}`}
                      className="text-[#5E704F] hover:underline"
                    >
                      {issue.person.fullName || "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{issue.person.phone || "—"}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setSelectedIssue(issue)}
                      className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
                    >
                      Исправить
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedIssue && (
        <IssueFixModal issue={selectedIssue} onClose={() => setSelectedIssue(null)} onFixed={handleIssueFixed} />
      )}
    </div>
  );
}
