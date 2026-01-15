"use client";

import { useState, useEffect } from "react";
import { qaText } from "@/lib/qaText";
import {
  buildBugReport,
  buildShortReport,
  buildEnvSnapshot,
  type CheckResult,
  type DeadendResult,
  type MatrixResult,
  type BugReportForm,
  type EnvSnapshot,
} from "@/lib/qa/report";

type QaBugReportCardProps = {
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


type ChecklistItem = {
  id: string;
  label: string;
  checked: boolean;
};

const PRIORITIES: string[] = [
  qaText.priorities.low,
  qaText.priorities.medium,
  qaText.priorities.high,
  qaText.priorities.blocker,
];

const getInitialChecklist = (): ChecklistItem[] => [
  { id: "env", label: qaText.bugChecklist.env, checked: false },
  { id: "role", label: qaText.bugChecklist.role, checked: false },
  { id: "reproduce", label: qaText.bugChecklist.reproduce, checked: false },
  { id: "results", label: qaText.bugChecklist.results, checked: false },
];

export default function QaBugReportCard({ envInfo, sessionSnapshot }: QaBugReportCardProps) {
  const [form, setForm] = useState<BugReportForm>({
    title: "",
    steps: "",
    expected: "",
    actual: "",
    priority: qaText.priorities.medium,
  });
  const [checklist, setChecklist] = useState<ChecklistItem[]>(getInitialChecklist());
  const [copied, setCopied] = useState(false);
  const [copiedShort, setCopiedShort] = useState(false);

  // Читаем результаты проверок из localStorage
  type CheckResult = {
    name: string;
    url: string;
    status: number | null;
    statusText: string;
    timeMs: number;
    error?: string;
  };
  type DeadendResult = {
    route: string;
    issue: string;
    details: string;
    finalUrl?: string;
    redirectCount?: number;
  };
  type MatrixResult = Record<string, Record<string, { status: string; httpStatus: number | null; finalUrl: string }>>;

  const [checksResults, setChecksResults] = useState<CheckResult[] | null>(null);
  const [matrixResults, setMatrixResults] = useState<MatrixResult | null>(null);
  const [deadendResults, setDeadendResults] = useState<DeadendResult[] | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const loadResults = () => {
      try {
        const checksStr = window.localStorage.getItem("qa-checks-results");
        if (checksStr) {
          const parsed = JSON.parse(checksStr) as CheckResult[];
          setChecksResults(parsed);
        }
        const matrixStr = window.localStorage.getItem("qa-matrix-results");
        if (matrixStr) {
          const parsed = JSON.parse(matrixStr) as MatrixResult;
          setMatrixResults(parsed);
        }
        const deadendsStr = window.localStorage.getItem("qa-deadends-results");
        if (deadendsStr) {
          const parsed = JSON.parse(deadendsStr) as DeadendResult[];
          setDeadendResults(parsed);
        }
      } catch {
        // Ignore
      }
    };

    loadResults();
  }, []);

  const handleCopyBugReport = async () => {
    const currentUrl = typeof window !== "undefined" ? window.location.href : "—";
    const snapshot = buildEnvSnapshot(envInfo, sessionSnapshot, currentUrl);

    const report = buildBugReport({
      snapshot,
      form: {
        title: form.title,
        steps: form.steps,
        expected: form.expected,
        actual: form.actual,
        priority: form.priority,
      },
      checks: checksResults,
      matrix: matrixResults,
      deadends: deadendResults,
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
    const summary = form.title
      ? `${form.title} (${form.priority})`
      : "Баг-репорт";
    const shortReport = buildShortReport(
      summary,
      snapshot,
      form.steps ? `Шаги: ${form.steps.substring(0, 50)}${form.steps.length > 50 ? "..." : ""}` : undefined
    );

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
    setForm({
      title: "",
      steps: "",
      expected: "",
      actual: "",
      priority: qaText.priorities.medium,
    });
    setChecklist(getInitialChecklist().map((item) => ({ ...item, checked: false })));
  };

  const toggleChecklist = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const applyTemplate = (template: "500" | "RBAC" | "deadend" | "redirect") => {
    switch (template) {
      case "500": {
        setForm({
          title: "Ошибка сервера (500)",
          steps: `1. Открыть страницу/эндпоинт
2. Выполнить действие, вызывающее ошибку
3. Наблюдать ответ сервера`,
          expected: "Страница/эндпоинт отвечает корректно (статус 200-299) или показывает понятную ошибку клиента (400-499)",
          actual: "Сервер возвращает ошибку 500 (Internal Server Error)",
          priority: qaText.priorities.blocker,
        });
        break;
      }
      case "RBAC": {
        setForm({
          title: "Проблема с доступом (RBAC)",
          steps: `1. Войти под ролью: [указать роль]
2. Перейти на маршрут: [указать маршрут]
3. Проверить доступ`,
          expected: "Доступ предоставлен/запрещён согласно правилам RBAC для данной роли",
          actual: "Доступ работает неожиданно: [описать фактическое поведение]",
          priority: qaText.priorities.high,
        });
        break;
      }
      case "deadend": {
        setForm({
          title: "Тупик в навигации",
          steps: `1. Открыть страницу: [указать URL]
2. Попытаться перейти по ссылке/кнопке
3. Проверить результат`,
          expected: "Пользователь попадает на корректную страницу или видит понятное сообщение",
          actual: "Пользователь попадает на несуществующую страницу (404) или зацикливается в редиректах",
          priority: qaText.priorities.medium,
        });
        break;
      }
      case "redirect": {
        setForm({
          title: "Проблема с редиректом/авторизацией",
          steps: `1. Открыть страницу: [указать URL]
2. Выполнить действие, требующее авторизации
3. Наблюдать поведение редиректа`,
          expected: "Пользователь корректно перенаправляется на страницу входа или получает доступ",
          actual: "Редирект работает неожиданно: [описать фактическое поведение, куда ведёт редирект]",
          priority: qaText.priorities.high,
        });
        break;
      }
    }
  };

  return (
    <section
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
      data-testid="qa-bugreport-card"
    >
      <h2 className="mb-2 text-lg font-semibold text-zinc-900">{qaText.headers.bugReport}</h2>
      <p className="mb-4 text-xs text-zinc-500" data-testid="qa-help-bugreport">
        {qaText.hints.bugReport}
      </p>

      <div className="space-y-4">
        {/* Кратко */}
        <div>
          <label htmlFor="qa-bug-title" className="mb-1 block text-sm font-medium text-zinc-700">
            {qaText.labels.brief}
          </label>
          <input
            type="text"
            id="qa-bug-title"
            data-testid="qa-bug-title"
            value={form.title}
            onChange={(e) => {
              const value = e.target.value;
              setForm((prev) => ({ ...prev, title: value }));
              if (typeof window !== "undefined") {
                try {
                  window.localStorage.setItem("qa-bug-title", value);
                } catch {
                  // ignore
                }
              }
            }}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-[#5E704F] focus:outline-none focus:ring-1 focus:ring-[#5E704F]"
            placeholder={qaText.placeholders.bugTitle}
          />
        </div>

        {/* Шаги воспроизведения */}
        <div>
          <label htmlFor="qa-bug-steps" className="mb-1 block text-sm font-medium text-zinc-700">
            {qaText.labels.steps}
          </label>
          <textarea
            id="qa-bug-steps"
            data-testid="qa-bug-steps"
            value={form.steps}
            onChange={(e) => setForm((prev) => ({ ...prev, steps: e.target.value }))}
            rows={4}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-[#5E704F] focus:outline-none focus:ring-1 focus:ring-[#5E704F]"
            placeholder={qaText.placeholders.bugSteps}
          />
        </div>

        {/* Ожидаемый результат */}
        <div>
          <label htmlFor="qa-bug-expected" className="mb-1 block text-sm font-medium text-zinc-700">
            {qaText.labels.expected}
          </label>
          <textarea
            id="qa-bug-expected"
            data-testid="qa-bug-expected"
            value={form.expected}
            onChange={(e) => setForm((prev) => ({ ...prev, expected: e.target.value }))}
            rows={3}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-[#5E704F] focus:outline-none focus:ring-1 focus:ring-[#5E704F]"
            placeholder={qaText.placeholders.bugExpected}
          />
        </div>

        {/* Фактический результат */}
        <div>
          <label htmlFor="qa-bug-actual" className="mb-1 block text-sm font-medium text-zinc-700">
            {qaText.labels.actual}
          </label>
          <textarea
            id="qa-bug-actual"
            data-testid="qa-bug-actual"
            value={form.actual}
            onChange={(e) => setForm((prev) => ({ ...prev, actual: e.target.value }))}
            rows={3}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-[#5E704F] focus:outline-none focus:ring-1 focus:ring-[#5E704F]"
            placeholder={qaText.placeholders.bugActual}
          />
        </div>

        {/* Приоритет */}
        <div>
          <label htmlFor="qa-bug-priority" className="mb-1 block text-sm font-medium text-zinc-700">
            {qaText.labels.priority}
          </label>
          <select
            id="qa-bug-priority"
            data-testid="qa-bug-priority"
            value={form.priority}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, priority: e.target.value as BugReportForm["priority"] }))
            }
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-[#5E704F] focus:outline-none focus:ring-1 focus:ring-[#5E704F]"
          >
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </div>

        {/* Быстрые шаблоны */}
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700">Быстрые шаблоны</label>
          <div className="flex flex-wrap gap-2" data-testid="qa-bug-templates">
            <button
              type="button"
              onClick={() => applyTemplate("500")}
              className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-red-500 hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
              aria-label="Заполнить форму шаблоном для ошибки сервера 500"
            >
              500/Ошибка сервера
            </button>
            <button
              type="button"
              onClick={() => applyTemplate("RBAC")}
              className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-amber-500 hover:bg-amber-50 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1"
              aria-label="Заполнить форму шаблоном для проблемы с доступом RBAC"
            >
              RBAC/Доступы
            </button>
            <button
              type="button"
              onClick={() => applyTemplate("deadend")}
              className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
              aria-label="Заполнить форму шаблоном для тупика в навигации"
            >
              Тупик/Навигация
            </button>
            <button
              type="button"
              onClick={() => applyTemplate("redirect")}
              className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
              aria-label="Заполнить форму шаблоном для проблемы с редиректом/авторизацией"
            >
              Редирект/Авторизация
            </button>
          </div>
        </div>

        {/* Чек-лист качества */}
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700">{qaText.misc.qualityChecklist}</label>
          <div className="space-y-2" data-testid="qa-bug-checklist">
            {checklist.map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => toggleChecklist(item.id)}
                  className="rounded border-zinc-300 text-[#5E704F] focus:ring-[#5E704F]"
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Кнопки */}
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={handleCopyBugReport}
            data-testid="qa-bug-copy"
            className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41] focus:outline-none focus:ring-2 focus:ring-[#5E704F] focus:ring-offset-1"
            aria-label={copied ? "Баг-репорт скопирован" : "Скопировать баг-репорт"}
            aria-live="polite"
          >
            {copied ? qaText.buttons.copied : qaText.buttons.copyBugReport}
          </button>
          <button
            type="button"
            onClick={handleCopyShort}
            data-testid="qa-bug-copy-short"
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-[#5E704F] hover:bg-[#5E704F]/5 hover:text-[#5E704F] focus:outline-none focus:ring-2 focus:ring-[#5E704F] focus:ring-offset-1"
            aria-label={copiedShort ? "Краткая версия скопирована" : "Скопировать краткую версию баг-репорта для чата"}
            aria-live="polite"
          >
            {copiedShort ? qaText.buttons.copied : qaText.buttons.copyBugReportShort}
          </button>
          <button
            type="button"
            onClick={handleReset}
            data-testid="qa-bug-reset"
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-[#5E704F] focus:ring-offset-1"
            aria-label="Сбросить форму баг-репорта"
          >
            {qaText.buttons.reset}
          </button>
        </div>
      </div>
    </section>
  );
}
