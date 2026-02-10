"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api/client";
import OfficeLoadingState from "../_components/OfficeLoadingState";
import OfficeErrorState from "../_components/OfficeErrorState";

type DiagnosticsData = {
  env: {
    hasPostgresUrl: boolean;
    hasNonPooling: boolean;
    picked: string | null;
  };
  ping: { ok: boolean; ms: number | null; error?: string };
  tables: { ok: boolean; missing: string[]; present: string[]; error?: string };
  jobsFailed: { last24h: number; recent: Array<{ id: string; type: string; error: string | null; updatedAt: string }> };
  ownership: { source: string };
  perf: { slowOpsCount: number };
  version: { commit: string | null; build: string | null; app: string | null };
};

export default function DiagnosticsClient() {
  const [data, setData] = useState<DiagnosticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiGet<DiagnosticsData>("/api/office/diagnostics");
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ошибка загрузки";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return <OfficeLoadingState message="Загружаем состояние системы..." testId="office-diagnostics-loading" />;
  }
  if (error) {
    return <OfficeErrorState message={error} onRetry={load} testId="office-diagnostics-error" />;
  }
  if (!data) {
    return <OfficeErrorState message="Нет данных" onRetry={load} testId="office-diagnostics-empty" />;
  }

  return (
    <div className="space-y-6" data-testid="office-diagnostics-root">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="text-sm text-zinc-500">DB</div>
          <div className="text-lg font-semibold">
            {data.ping.ok ? "OK" : "FAIL"}
            {data.ping.ms !== null ? ` · ${data.ping.ms}ms` : ""}
          </div>
          {data.ping.error ? <div className="text-xs text-rose-600">{data.ping.error}</div> : null}
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="text-sm text-zinc-500">Таблицы</div>
          <div className="text-lg font-semibold">{data.tables.ok ? "OK" : "Missing"}</div>
          {!data.tables.ok ? (
            <div className="text-xs text-rose-600">Missing: {data.tables.missing.join(", ")}</div>
          ) : null}
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="text-sm text-zinc-500">Jobs failures (24h)</div>
          <div className="text-lg font-semibold">{data.jobsFailed.last24h}</div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="text-sm text-zinc-500">Perf slow ops</div>
          <div className="text-lg font-semibold">{data.perf.slowOpsCount}</div>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="text-sm text-zinc-500">Ownership store</div>
        <div className="text-sm">{data.ownership.source}</div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="text-sm text-zinc-500">Версия</div>
        <div className="text-sm">
          commit: {data.version.commit ?? "n/a"} · build: {data.version.build ?? "n/a"} · app:{" "}
          {data.version.app ?? "n/a"}
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="text-sm text-zinc-500 mb-2">Последние ошибки jobs</div>
        {data.jobsFailed.recent.length === 0 ? (
          <div className="text-sm text-zinc-500">Нет ошибок</div>
        ) : (
          <div className="space-y-2 text-sm">
            {data.jobsFailed.recent.map((job) => (
              <div key={job.id} className="border-b border-zinc-100 pb-2 last:border-none">
                <div className="font-medium">{job.type}</div>
                <div className="text-xs text-zinc-500">{job.updatedAt}</div>
                {job.error ? <div className="text-xs text-rose-600">{job.error}</div> : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
