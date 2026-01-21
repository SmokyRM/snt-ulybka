"use client";

import { useState, useCallback } from "react";
import { primaryButtonClass, secondaryButtonClass } from "./qaStyles";
import { useToast, CopyReportModal, downloadJson } from "./QaReportUtils";
import { apiGet, apiPost } from "@/lib/api/client";

type QualityReport = {
  reportId: string;
  generatedAt: string;
  app: {
    env: string;
    version?: string;
    commit?: string;
  };
  sessionContext: {
    role: string | null;
    effectiveRole: string | null;
    normalizedRole: string | null;
    qaScenario: string | null;
  };
  checks: {
    health: {
      ok: boolean;
      status: number;
      timingMs: number;
      error?: string;
    };
    accessMatrix: {
      results: Record<string, Record<string, unknown>>;
      summary: {
        ok: number;
        mismatches: number;
        forbiddenOk: number;
        loginOk: number;
        errors: number;
        pass: boolean;
      };
      timingMs: number;
    };
    deadEnds: {
      issues: Array<{
        route: string;
        issue: string;
        details: string;
        finalUrl?: string;
        redirectCount?: number;
      }>;
      pass: boolean;
    };
    smoke: {
      issues: Array<{
        route: string;
        issue: string;
        details: string;
        status: number;
        finalUrl: string;
      }>;
      pass: boolean;
    };
  };
};

type QualitySummary = {
  pass: boolean;
  totals: {
    healthOk: number;
    matrixMismatches: number;
    deadEndsIssues: number;
    smokeIssues: number;
  };
};

export default function QaQualityCenterCard() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<QualityReport | null>(null);
  const [summary, setSummary] = useState<QualitySummary | null>(null);
  const [status, setStatus] = useState<{ type: "idle" | "loading" | "success" | "error"; message?: string }>({
    type: "idle",
  });
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [reportJsonForModal, setReportJsonForModal] = useState<string>("");
  const { showToast, ToastComponent } = useToast();

  const runQualityCenter = useCallback(async () => {
    setLoading(true);
    setReport(null);
    setSummary(null);
    setStatus({ type: "loading", message: "Запуск Quality Center..." });

    try {
      const data = await apiPost<{ report?: QualityReport; summary?: QualitySummary }>("/api/admin/qa/run");
      setReport(data.report ?? null);
      setSummary(data.summary ?? null);
      setStatus({
        type: "success",
        message: data.summary?.pass ? "Все проверки пройдены" : "Обнаружены проблемы",
      });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Ошибка при выполнении проверок",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCopyReport = useCallback(() => {
    if (!report) return;
    const json = JSON.stringify(report, null, 2);
    setReportJsonForModal(json);
    setShowCopyModal(true);
  }, [report]);

  const handleDownloadJson = useCallback(() => {
    if (!report) return;
    const json = JSON.stringify(report, null, 2);
    downloadJson(json, `qa-quality-center-${report.reportId}.json`);
    showToast("Отчёт скачан");
  }, [report, showToast]);

  const handleDownloadFromServer = useCallback(async () => {
    if (!report?.reportId) return;
    try {
      const data = await apiGet<Record<string, unknown>>(
        `/api/admin/qa/report?id=${encodeURIComponent(report.reportId)}`
      );
      const json = JSON.stringify(data, null, 2);
      downloadJson(json, `qa-quality-center-${report.reportId}.json`);
      showToast("Отчёт скачан");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Ошибка при скачивании");
    }
  }, [report, showToast]);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm" data-testid="qa-quality-center-card">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-zinc-900">Quality Center</h3>
        <p className="mt-1 text-sm text-zinc-600">
          Единый центр проверок качества: Health check, Access Matrix, Dead-ends, Smoke tests
        </p>
      </div>

      {status.type === "idle" && (
        <button
          type="button"
          onClick={runQualityCenter}
          className={primaryButtonClass}
          data-testid="qa-quality-center-run-btn"
        >
          Запустить Quality Center
        </button>
      )}

      {status.type === "loading" && (
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#5E704F] border-t-transparent" />
          <span className="text-sm text-zinc-600">{status.message}</span>
        </div>
      )}

      {status.type === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {status.message}
        </div>
      )}

      {status.type === "success" && summary && report && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`rounded-full px-3 py-1 text-sm font-semibold ${
                  summary.pass
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
                data-testid="qa-quality-center-pass-badge"
              >
                {summary.pass ? "PASS" : "FAIL"}
              </div>
              <span className="text-sm text-zinc-600">{status.message}</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopyReport}
                className={secondaryButtonClass}
                data-testid="qa-quality-center-copy-btn"
              >
                Скопировать отчёт (JSON)
              </button>
              <button
                type="button"
                onClick={handleDownloadFromServer}
                className={secondaryButtonClass}
                data-testid="qa-quality-center-download-btn"
              >
                Скачать .json
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <div className="text-xs text-zinc-600">Health OK</div>
              <div className="mt-1 text-2xl font-semibold text-zinc-900" data-testid="qa-quality-center-health-ok">
                {summary.totals.healthOk}
              </div>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <div className="text-xs text-zinc-600">Matrix Mismatches</div>
              <div className="mt-1 text-2xl font-semibold text-zinc-900" data-testid="qa-quality-center-matrix-mismatches">
                {summary.totals.matrixMismatches}
              </div>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <div className="text-xs text-zinc-600">Dead-ends Issues</div>
              <div className="mt-1 text-2xl font-semibold text-zinc-900" data-testid="qa-quality-center-deadends-issues">
                {summary.totals.deadEndsIssues}
              </div>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <div className="text-xs text-zinc-600">Smoke Issues</div>
              <div className="mt-1 text-2xl font-semibold text-zinc-900" data-testid="qa-quality-center-smoke-issues">
                {summary.totals.smokeIssues}
              </div>
            </div>
          </div>

          {report.checks.deadEnds.issues.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="text-sm font-semibold text-amber-900">Dead-ends Issues:</div>
              <ul className="mt-2 space-y-1 text-xs text-amber-800">
                {report.checks.deadEnds.issues.slice(0, 5).map((issue, idx) => (
                  <li key={idx}>
                    {issue.route}: {issue.issue} - {issue.details}
                  </li>
                ))}
                {report.checks.deadEnds.issues.length > 5 && (
                  <li>... и ещё {report.checks.deadEnds.issues.length - 5}</li>
                )}
              </ul>
            </div>
          )}

          {report.checks.smoke.issues.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="text-sm font-semibold text-amber-900">Smoke Issues:</div>
              <ul className="mt-2 space-y-1 text-xs text-amber-800">
                {report.checks.smoke.issues.slice(0, 5).map((issue, idx) => (
                  <li key={idx}>
                    {issue.route}: {issue.issue} - {issue.details}
                  </li>
                ))}
                {report.checks.smoke.issues.length > 5 && (
                  <li>... и ещё {report.checks.smoke.issues.length - 5}</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      <CopyReportModal
        open={showCopyModal}
        onClose={() => setShowCopyModal(false)}
        content={reportJsonForModal}
        testId="qa-quality-center-copy-modal"
      />

      {ToastComponent}
    </div>
  );
}
