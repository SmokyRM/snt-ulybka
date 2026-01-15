"use client";

import { useRef, useState, useEffect } from "react";
import {
  buildEnvSnapshot,
  buildTestRunReport as buildTestRunReportFromLib,
  buildShortReport,
  type EnvInfo,
  type SessionSnapshot,
  type CheckResult,
  type MatrixResult,
  type DeadendResult,
  type TestRunData,
} from "@/lib/qa/report";

type QaStateBarProps = {
  enabled: boolean;
  envInfo: EnvInfo;
  sessionSnapshot: SessionSnapshot;
};

type QaPackage = {
  version: string;
  exportedAt: string;
  snapshot: unknown;
  checks: CheckResult[] | null;
  matrix: MatrixResult | null;
  deadends: DeadendResult[] | null;
  runLog: string | null;
  bugDraft: unknown;
  testPlan: unknown;
  reports: {
    full: string | null;
    short: string | null;
  };
};

const STORAGE_KEY = "qa.dashboard.v1";
const SENSITIVE_KEYS = ["password", "token", "cookie", "authorization", "secret"];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeForExport<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(sanitizeForExport) as unknown as T;
  }
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) {
      const lower = key.toLowerCase();
      if (SENSITIVE_KEYS.some((s) => lower.includes(s))) continue;
      result[key] = sanitizeForExport(v);
    }
    return result as T;
  }
  return value;
}

export default function QaStateBar({ enabled, envInfo, sessionSnapshot }: QaStateBarProps) {
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { lastUpdated?: string };
      if (parsed.lastUpdated) setLastSaved(parsed.lastUpdated);
    } catch {
      // ignore
    }
  }, [enabled]);

  const collectState = () => {
    if (typeof window === "undefined") return null;

    try {
      const checksStr = window.localStorage.getItem("qa-checks-results");
      const matrixStr = window.localStorage.getItem("qa-matrix-results");
      const deadendsStr = window.localStorage.getItem("qa-deadends-results");
      const bugDraftStr = window.localStorage.getItem("qa-bug-draft");
      const testPlanStr = window.localStorage.getItem("qa-testplan-state");
      const runLog = window.localStorage.getItem("qa-run-log");
      const selectedRunProfile = window.localStorage.getItem("qa-selected-run-profile");

      return {
        selectedRunProfile,
        checksResult: checksStr ? JSON.parse(checksStr) : null,
        matrixResult: matrixStr ? JSON.parse(matrixStr) : null,
        deadendsResult: deadendsStr ? JSON.parse(deadendsStr) : null,
        runLog,
        bugReportFormDraft: bugDraftStr ? JSON.parse(bugDraftStr) : null,
        ticketDraft: null,
        testPlanState: testPlanStr ? JSON.parse(testPlanStr) : null,
        lastUpdated: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  };

  const saveNow = () => {
    if (!enabled || typeof window === "undefined") return;
    const state = collectState();
    if (!state) return;
    const safe = sanitizeForExport(state);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
    setLastSaved(state.lastUpdated);
  };

  const debouncedSave = () => {
    if (debounceRef.current != null) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      saveNow();
    }, 450);
  };

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const handler = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key.startsWith("qa-") && !e.key.startsWith(STORAGE_KEY)) {
        debouncedSave();
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [enabled]);

  const getTestRunReports = (): { full: string | null; short: string | null } => {
    if (typeof window === "undefined") return { full: null, short: null };

    try {
      // Получаем данные для отчёта
      const checksStr = window.localStorage.getItem("qa-checks-results");
      const matrixStr = window.localStorage.getItem("qa-matrix-results");
      const deadendsStr = window.localStorage.getItem("qa-deadends-results");
      const snapshotStr = window.localStorage.getItem("qa-env-snapshot");

      const checksResults = checksStr ? (JSON.parse(checksStr) as CheckResult[]) : null;
      const matrixResults = matrixStr ? (JSON.parse(matrixStr) as MatrixResult) : null;
      const deadendsResults = deadendsStr ? (JSON.parse(deadendsStr) as DeadendResult[]) : null;

      let snapshot: unknown = null;
      if (snapshotStr) {
        snapshot = JSON.parse(snapshotStr);
      } else {
        const currentUrl = window.location.href;
        snapshot = buildEnvSnapshot(envInfo, sessionSnapshot, currentUrl);
      }

      // Получаем сценарии из window.__qaTestPlanScenarios
      type WindowWithQa = Window & {
        __qaTestPlanScenarios?: () => Array<{
          id: string;
          title: string;
          steps: Array<{ id: string; text: string; checked: boolean }>;
          note: string;
        }>;
      };
      const win = window as WindowWithQa;
      const getScenarios = win.__qaTestPlanScenarios;
      const scenarios = typeof getScenarios === "function" ? getScenarios() : [];

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
        comment: window.localStorage.getItem("qa-testrun-comment") || undefined,
      };

      if (scenarios.length === 0 && !checksResults && !matrixResults && !deadendsResults) {
        return { full: null, short: null };
      }

      const currentUrl = window.location.href;
      const envSnapshot = snapshot as {
        timestamp: Date;
        env: EnvInfo;
        session: SessionSnapshot;
        currentUrl: string;
        userAgent?: string;
        timezone?: string;
        featureFlags?: Record<string, boolean>;
        hasSensitiveDataHidden?: boolean;
      };

      const fullReport = buildTestRunReportFromLib({
        snapshot: envSnapshot,
        testRun: testRunData,
        checks: checksResults,
        matrix: matrixResults,
        deadends: deadendsResults,
      });

      const summary = `${testRunData.scenarios.reduce((acc, s) => acc + s.steps.filter((st) => st.checked).length, 0)}/${testRunData.scenarios.reduce((acc, s) => acc + s.steps.length, 0)} шагов выполнено`;
      const shortReport = buildShortReport("Отчёт прогона тестов", envSnapshot, summary);

      return { full: fullReport, short: shortReport };
    } catch {
      return { full: null, short: null };
    }
  };

  const handleExport = () => {
    if (!enabled || typeof window === "undefined") return;

    try {
      const currentUrl = window.location.href;
      const snapshot = buildEnvSnapshot(envInfo, sessionSnapshot, currentUrl);

      const checksStr = window.localStorage.getItem("qa-checks-results");
      const matrixStr = window.localStorage.getItem("qa-matrix-results");
      const deadendsStr = window.localStorage.getItem("qa-deadends-results");
      const bugDraftStr = window.localStorage.getItem("qa-bug-draft");
      const testPlanStr = window.localStorage.getItem("qa-testplan-state");
      const runLog = window.localStorage.getItem("qa-run-log");

      const checks = checksStr ? (JSON.parse(checksStr) as CheckResult[]) : null;
      const matrix = matrixStr ? (JSON.parse(matrixStr) as MatrixResult) : null;
      const deadends = deadendsStr ? (JSON.parse(deadendsStr) as DeadendResult[]) : null;
      const bugDraft = bugDraftStr ? JSON.parse(bugDraftStr) : null;
      const testPlan = testPlanStr ? JSON.parse(testPlanStr) : null;

      const reports = getTestRunReports();

      const packageData: QaPackage = {
        version: "qa-package-v1",
        exportedAt: new Date().toISOString(),
        snapshot: sanitizeForExport(snapshot),
        checks: sanitizeForExport(checks),
        matrix: sanitizeForExport(matrix),
        deadends: sanitizeForExport(deadends),
        runLog: runLog || null,
        bugDraft: sanitizeForExport(bugDraft),
        testPlan: sanitizeForExport(testPlan),
        reports,
      };

      const sanitized = sanitizeForExport(packageData);
      const json = JSON.stringify(sanitized, null, 2);

      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const dateStr = `${year}${month}${day}-${hours}${minutes}`;
      const filename = `qa-package-${dateStr}.json`;

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setNotification("Пакет экспортирован");
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      setNotification(`Ошибка экспорта: ${error instanceof Error ? error.message : "неизвестная ошибка"}`);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleExportReport = () => {
    if (!enabled || typeof window === "undefined") return;

    try {
      const reports = getTestRunReports();
      if (!reports.full) {
        setNotification("Нет данных для отчёта");
        setTimeout(() => setNotification(null), 3000);
        return;
      }

      const blob = new Blob([reports.full], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const dateStr = `${year}${month}${day}-${hours}${minutes}`;
      const filename = `qa-report-${dateStr}.md`;

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setNotification("Отчёт экспортирован");
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      setNotification(`Ошибка экспорта отчёта: ${error instanceof Error ? error.message : "неизвестная ошибка"}`);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleImport = () => {
    if (!enabled || typeof window === "undefined") return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!enabled || typeof window === "undefined") return;

    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;

      if (!isPlainObject(parsed)) {
        throw new Error("Неверный формат файла");
      }

      if (parsed.version !== "qa-package-v1") {
        throw new Error(`Неподдерживаемая версия пакета: ${parsed.version}`);
      }

      // Восстанавливаем данные
      if (parsed.checks) {
        window.localStorage.setItem("qa-checks-results", JSON.stringify(parsed.checks));
      }
      if (parsed.matrix) {
        window.localStorage.setItem("qa-matrix-results", JSON.stringify(parsed.matrix));
      }
      if (parsed.deadends) {
        window.localStorage.setItem("qa-deadends-results", JSON.stringify(parsed.deadends));
      }
      if (parsed.runLog && typeof parsed.runLog === "string") {
        window.localStorage.setItem("qa-run-log", parsed.runLog);
      }
      if (parsed.bugDraft) {
        window.localStorage.setItem("qa-bug-draft", JSON.stringify(parsed.bugDraft));
      }
      if (parsed.testPlan) {
        window.localStorage.setItem("qa-testplan-state", JSON.stringify(parsed.testPlan));
      }
      if (parsed.snapshot) {
        window.localStorage.setItem("qa-env-snapshot", JSON.stringify(parsed.snapshot));
      }

      setNotification("Пакет загружен");
      setTimeout(() => setNotification(null), 3000);

      // Перезагружаем страницу для применения изменений
      window.location.reload();
    } catch (error) {
      setNotification(`Не удалось загрузить пакет: ${error instanceof Error ? error.message : "неизвестная ошибка"}`);
      setTimeout(() => setNotification(null), 5000);
    }

    // Сбрасываем input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleReset = () => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(STORAGE_KEY);
    setLastSaved(null);
    setNotification("Состояние сброшено");
    setTimeout(() => setNotification(null), 3000);
  };

  if (!enabled) return null;

  const formattedLastSaved = lastSaved
    ? new Date(lastSaved).toLocaleString("ru-RU")
    : "ещё не сохранялось";

  const reports = getTestRunReports();
  const hasReport = reports.full !== null;

  return (
    <>
      <div
        className="mb-4 flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-xs text-zinc-700"
        data-testid="qa-state-bar"
      >
        <div className="flex items-center justify-between">
          <span>Последнее сохранение: {formattedLastSaved}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={saveNow}
              data-testid="qa-state-save"
              className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 transition-colors hover:border-[#5E704F] hover:bg-[#5E704F]/5 hover:text-[#5E704F] focus:outline-none focus:ring-2 focus:ring-[#5E704F] focus:ring-offset-1"
            >
              Сохранить сейчас
            </button>
            <button
              type="button"
              onClick={handleReset}
              data-testid="qa-state-reset"
              className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 transition-colors hover:border-red-500 hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
            >
              Сбросить всё
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-zinc-100 pt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              data-testid="qa-export"
              className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 transition-colors hover:border-[#5E704F] hover:bg-[#5E704F]/5 hover:text-[#5E704F] focus:outline-none focus:ring-2 focus:ring-[#5E704F] focus:ring-offset-1"
            >
              Скачать пакет QA
            </button>
            <button
              type="button"
              onClick={handleImport}
              data-testid="qa-import"
              className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 transition-colors hover:border-[#5E704F] hover:bg-[#5E704F]/5 hover:text-[#5E704F] focus:outline-none focus:ring-2 focus:ring-[#5E704F] focus:ring-offset-1"
            >
              Загрузить пакет QA
            </button>
            {hasReport && (
              <button
                type="button"
                onClick={handleExportReport}
                data-testid="qa-export-report"
                className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 transition-colors hover:border-[#5E704F] hover:bg-[#5E704F]/5 hover:text-[#5E704F] focus:outline-none focus:ring-2 focus:ring-[#5E704F] focus:ring-offset-1"
              >
                Скачать отчёт прогона
              </button>
            )}
          </div>
          <p className="text-xs text-zinc-500" data-testid="qa-help-export">
            Пакет содержит результаты проверок/матрицы/тупиков, лог действий и снимок среды. Его можно приложить к задаче.
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
          aria-label="Загрузить пакет QA"
        />
      </div>

      {notification && (
        <div
          className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs text-zinc-700"
          role="alert"
          aria-live="polite"
        >
          {notification}
        </div>
      )}
    </>
  );
}
