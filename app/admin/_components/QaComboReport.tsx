"use client";

import { useState, useEffect } from "react";
import {
  buildDiagnosticsReport,
  buildShortReport,
  buildEnvSnapshot,
  type CheckResult,
  type DeadendResult,
  type MatrixResult,
  type EnvInfo,
  type SessionSnapshot,
} from "@/lib/qa/report";

type QaComboReportProps = {
  envInfo: EnvInfo;
  sessionSnapshot: SessionSnapshot;
};

export default function QaComboReport({ envInfo, sessionSnapshot }: QaComboReportProps) {
  const [copied, setCopied] = useState(false);
  const [copiedShort, setCopiedShort] = useState(false);
  const [checksResults, setChecksResults] = useState<CheckResult[] | null>(null);
  const [matrixResults, setMatrixResults] = useState<MatrixResult | null>(null);
  const [deadendResults, setDeadendResults] = useState<DeadendResult[] | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadResults = () => {
      try {
        const checksStr = window.localStorage.getItem("qa-checks-results");
        if (checksStr) {
          setChecksResults(JSON.parse(checksStr) as CheckResult[]);
        }
        const matrixStr = window.localStorage.getItem("qa-matrix-results");
        if (matrixStr) {
          setMatrixResults(JSON.parse(matrixStr) as MatrixResult);
        }
        const deadendsStr = window.localStorage.getItem("qa-deadends-results");
        if (deadendsStr) {
          setDeadendResults(JSON.parse(deadendsStr) as DeadendResult[]);
        }
      } catch {
        // Ignore
      }
    };

    loadResults();
  }, []);

  const handleCopyCombo = async () => {
    const currentUrl = typeof window !== "undefined" ? window.location.href : "—";
    const snapshot = buildEnvSnapshot(envInfo, sessionSnapshot, currentUrl);

    // Подсчитываем статистику
    const checksCount = checksResults?.length || 0;
    const checksOk = checksResults?.filter((c) => c.status !== null && c.status >= 200 && c.status < 300).length || 0;
    const deadendsCount = deadendResults?.length || 0;

    const report = buildDiagnosticsReport({
      snapshot,
      checks: checksResults,
      matrix: matrixResults,
      deadends: deadendResults,
    });

    // Добавляем статистику и ссылки
    const statsSection = `## Статистика проверок

- **Проверки (checks):** ${checksCount} (успешно: ${checksOk})
- **Матрица доступов:** ${matrixResults ? "да" : "нет"}
- **Тупики найдено:** ${deadendsCount}

`;

    const linksSection = `

## Ссылки

- **Текущая страница:** ${currentUrl}
- **QA кабинет:** ${typeof window !== "undefined" ? window.location.origin : ""}/admin/qa

`;

    const fullReport =
      report.replace("# Диагностический отчёт QA", "# Комбо-отчёт QA").replace(
        "## Снимок среды",
        statsSection + "## Снимок среды"
      ) + linksSection;

    try {
      await navigator.clipboard.writeText(fullReport);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = fullReport;
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
    const checksCount = checksResults?.length || 0;
    const checksOk = checksResults?.filter((c) => c.status !== null && c.status >= 200 && c.status < 300).length || 0;
    const deadendsCount = deadendResults?.length || 0;
    const summary = `Проверки: ${checksOk}/${checksCount}, тупики: ${deadendsCount}`;

    const shortReport = buildShortReport("Комбо-отчёт QA", snapshot, summary);

    try {
      await navigator.clipboard.writeText(shortReport);
      setCopiedShort(true);
      setTimeout(() => setCopiedShort(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = shortReport;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopiedShort(true);
        setTimeout(() => setCopiedShort(false), 2000);
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
          onClick={handleCopyCombo}
          data-testid="qa-copy-combo"
          className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41] focus:outline-none focus:ring-2 focus:ring-[#5E704F] focus:ring-offset-1"
          aria-label={copied ? "Комбо-отчёт скопирован" : "Скопировать комбо-отчёт со всеми результатами проверок"}
          aria-live="polite"
        >
          {copied ? "Скопировано" : "Скопировать всё (комбо-отчёт)"}
        </button>
        <button
          type="button"
          onClick={handleCopyShort}
          data-testid="qa-copy-combo-short"
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-[#5E704F] hover:bg-[#5E704F]/5 hover:text-[#5E704F] focus:outline-none focus:ring-2 focus:ring-[#5E704F] focus:ring-offset-1"
          aria-label={copiedShort ? "Краткая версия скопирована" : "Скопировать краткую версию комбо-отчёта для чата"}
          aria-live="polite"
        >
          {copiedShort ? "Скопировано" : "Кратко для чата"}
        </button>
      </div>
      <p className="text-xs text-zinc-500" data-testid="qa-help-combo">
        Объединяет все результаты проверок, матрицы и тупиков в один отчёт
      </p>
    </div>
  );
}
