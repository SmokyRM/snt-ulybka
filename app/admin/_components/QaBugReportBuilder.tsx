"use client";

import { useState } from "react";
import { qaText } from "@/lib/qaText";
import {
  buildDiagnosticsReport,
  buildShortReport,
  buildEnvSnapshot,
  type CheckResult,
  type DeadendResult,
  type MatrixResult,
} from "@/lib/qa/report";

type BugReportBuilderProps = {
  envInfo: {
    NODE_ENV: string | undefined;
    ENABLE_QA: string | undefined;
    NEXT_PUBLIC_APP_VERSION?: string;
    GIT_SHA?: string;
  };
  sessionSnapshot: {
    role?: string;
    userId?: string;
    isQaOverride?: boolean;
  };
  checksResults?: Array<{
    name: string;
    url: string;
    status: number | null;
    statusText: string;
    timeMs: number;
    error?: string;
  }>;
  matrixResults?: Record<string, Record<string, { status: string; httpStatus: number | null; finalUrl: string }>> | null;
  deadendResults?: Array<{
    route: string;
    issue: string;
    details: string;
    finalUrl?: string;
    redirectCount?: number;
  }>;
};

export default function QaBugReportBuilder({
  envInfo,
  sessionSnapshot,
  checksResults,
  matrixResults,
  deadendResults,
}: BugReportBuilderProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyBugReport = async () => {
    const timestamp = new Date();
    const currentUrl = typeof window !== "undefined" ? window.location.href : "—";

    // Читаем результаты из localStorage
    let checksData: CheckResult[] | null = checksResults || null;
    let matrixData: MatrixResult | null = matrixResults || null;
    let deadendsData: DeadendResult[] | null = deadendResults || null;

    if (typeof window !== "undefined") {
      try {
        const checksStr = window.localStorage.getItem("qa-checks-results");
        if (checksStr && !checksData) {
          checksData = JSON.parse(checksStr) as CheckResult[];
        }
        const matrixStr = window.localStorage.getItem("qa-matrix-results");
        if (matrixStr && !matrixData) {
          matrixData = JSON.parse(matrixStr) as MatrixResult;
        }
        const deadendsStr = window.localStorage.getItem("qa-deadends-results");
        if (deadendsStr && !deadendsData) {
          deadendsData = JSON.parse(deadendsStr) as DeadendResult[];
        }
      } catch {
        // Ignore
      }
    }

    const snapshot = buildEnvSnapshot(envInfo, sessionSnapshot, currentUrl);
    const report = buildDiagnosticsReport({
      snapshot,
      checks: checksData,
      matrix: matrixData,
      deadends: deadendsData,
    });

    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback для старых браузеров
      const textArea = document.createElement("textarea");
      textArea.value = report;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Ignore
      }
      document.body.removeChild(textArea);
    }
  };

  const handleCopyShort = async () => {
    const currentUrl = typeof window !== "undefined" ? window.location.href : "—";
    const snapshot = buildEnvSnapshot(envInfo, sessionSnapshot, currentUrl);
    const shortReport = buildShortReport("Баг-репорт", snapshot, "См. полный отчёт");

    try {
      await navigator.clipboard.writeText(shortReport);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = shortReport;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Ignore
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleCopyBugReport}
          data-testid="qa-copy-bugreport"
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-[#5E704F] hover:bg-[#5E704F]/5 hover:text-[#5E704F] focus:outline-none focus:ring-2 focus:ring-[#5E704F] focus:ring-offset-1"
          aria-label={copied ? "Баг-репорт скопирован" : "Скопировать баг-репорт"}
          aria-live="polite"
        >
          {copied ? qaText.buttons.copied : qaText.buttons.copyBugReport}
        </button>
        <button
          type="button"
          onClick={handleCopyShort}
          data-testid="qa-copy-bugreport-short"
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-[#5E704F] hover:bg-[#5E704F]/5 hover:text-[#5E704F] focus:outline-none focus:ring-2 focus:ring-[#5E704F] focus:ring-offset-1"
          aria-label={copied ? "Краткая версия скопирована" : "Скопировать краткую версию баг-репорта для чата"}
          aria-live="polite"
        >
          {copied ? qaText.buttons.copied : "Кратко для чата"}
        </button>
      </div>
      <p className="text-xs text-zinc-500" data-testid="qa-help-report">
        {qaText.hints.report}
      </p>
    </div>
  );
}
