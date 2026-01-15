"use client";

import { useState, useEffect } from "react";
import { qaText } from "@/lib/qaText";
import {
  buildTestRunReport,
  buildShortReport,
  buildEnvSnapshot,
  type CheckResult,
  type DeadendResult,
  type MatrixResult,
  type TestRunData,
} from "@/lib/qa/report";

type QaTestRunCardProps = {
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
};

type TestStep = {
  id: string;
  text: string;
  checked: boolean;
};

type TestScenario = {
  id: string;
  title: string;
  steps: TestStep[];
  note: string;
};

export default function QaTestRunCard({ envInfo, sessionSnapshot }: QaTestRunCardProps) {
  const [comment, setComment] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedShort, setCopiedShort] = useState(false);
  const [scenarios, setScenarios] = useState<TestScenario[]>([]);
  const [checksResults, setChecksResults] = useState<CheckResult[] | null>(null);
  const [matrixResults, setMatrixResults] = useState<MatrixResult | null>(null);
  const [deadendResults, setDeadendResults] = useState<DeadendResult[] | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Получаем данные сценариев из QaTestPlanCard
    const loadScenarios = () => {
      try {
        type WindowWithQa = Window & {
          __qaTestPlanScenarios?: () => TestScenario[];
        };
        const win = window as WindowWithQa;
        const getScenarios = win.__qaTestPlanScenarios;
        if (typeof getScenarios === "function") {
          const data = getScenarios();
          if (Array.isArray(data)) {
            setScenarios(data);
          }
        }
      } catch {
        // Ignore
      }
    };

    // Загружаем результаты проверок
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

    loadScenarios();
    loadResults();

    // Периодически обновляем данные сценариев
    const interval = setInterval(() => {
      loadScenarios();
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleCopyReport = async () => {
    const currentUrl = typeof window !== "undefined" ? window.location.href : "—";
    const snapshot = buildEnvSnapshot(envInfo, sessionSnapshot, currentUrl);

    // Автоматически собираем снимок при начале прогона
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("qa-env-snapshot", JSON.stringify(snapshot));
      } catch {
        // ignore
      }
    }

    const testRunData: TestRunData = {
      scenarios: scenarios.map((s) => ({
        id: s.id,
        title: s.title,
        steps: s.steps.map((step) => ({
          id: step.id,
          text: step.text,
          checked: step.checked,
        })),
        note: s.note,
      })),
      comment,
    };

    const report = buildTestRunReport({
      snapshot,
      testRun: testRunData,
      checks: checksResults,
      matrix: matrixResults,
      deadends: deadendResults,
    });

    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
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
    let totalSteps = 0;
    let completedSteps = 0;
    scenarios.forEach((s) => {
      totalSteps += s.steps.length;
      completedSteps += s.steps.filter((step) => step.checked).length;
    });

    const percent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
    const summary = `${completedSteps}/${totalSteps} шагов (${percent}%)${comment ? `, комментарий: ${comment.substring(0, 30)}${comment.length > 30 ? "..." : ""}` : ""}`;

    const shortReport = buildShortReport("Отчёт прогона тестов", snapshot, summary);

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

  const handleReset = () => {
    setComment("");
    // Сброс отметок будет через QaTestPlanCard
    if (typeof window !== "undefined") {
      type WindowWithQa = Window & {
        __qaTestPlanReset?: () => void;
      };
      const win = window as WindowWithQa;
      if (typeof win.__qaTestPlanReset === "function") {
        win.__qaTestPlanReset();
      }
    }
  };

  return (
    <section
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
      data-testid="qa-testrun-card"
    >
      <h2 className="mb-4 text-lg font-semibold text-zinc-900">{qaText.headers.testRun}</h2>

      <div className="space-y-4">
        {/* Комментарий */}
        <div>
          <label htmlFor="qa-testrun-comment" className="mb-1 block text-sm font-medium text-zinc-700">
            {qaText.labels.commentTestRun}
          </label>
          <textarea
            id="qa-testrun-comment"
            data-testid="qa-testrun-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-[#5E704F] focus:outline-none focus:ring-1 focus:ring-[#5E704F]"
            placeholder={qaText.placeholders.testRunComment}
          />
        </div>

        {/* Кнопки */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCopyReport}
            data-testid="qa-testrun-copy"
            className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41] focus:outline-none focus:ring-2 focus:ring-[#5E704F] focus:ring-offset-1"
            aria-label={copied ? "Отчёт прогона скопирован" : "Скопировать полный отчёт прогона тестов"}
            aria-live="polite"
          >
            {copied ? qaText.buttons.copied : qaText.buttons.copyTestRunReport}
          </button>
          <button
            type="button"
            onClick={handleCopyShort}
            data-testid="qa-testrun-copy-short"
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-[#5E704F] hover:bg-[#5E704F]/5 hover:text-[#5E704F] focus:outline-none focus:ring-2 focus:ring-[#5E704F] focus:ring-offset-1"
            aria-label={copiedShort ? "Краткая версия скопирована" : "Скопировать краткую версию отчёта прогона для чата"}
            aria-live="polite"
          >
            {copiedShort ? qaText.buttons.copied : qaText.buttons.copyTestRunShort}
          </button>
          <button
            type="button"
            onClick={handleReset}
            data-testid="qa-testrun-reset"
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-[#5E704F] focus:ring-offset-1"
            aria-label="Сбросить все отметки в сценариях тестирования"
          >
            {qaText.buttons.resetMarks}
          </button>
        </div>
      </div>
    </section>
  );
}
