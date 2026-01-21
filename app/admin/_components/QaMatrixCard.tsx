"use client";

import { useState, useEffect } from "react";
import { qaText } from "@/lib/qaText";
import { primaryButtonClass, secondaryButtonClass } from "./qaStyles";
import { useToast, CopyReportModal, downloadJson } from "./QaReportUtils";
import { ApiError, apiGetRaw, readOk } from "@/lib/api/client";

// Компонент для отображения подробностей ячейки матрицы
function MatrixCellDetails({ cell }: { cell: MatrixCell }) {
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="text-xs text-blue-600 underline hover:text-blue-800"
      >
        Подробнее →
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-2 rounded border border-zinc-200 bg-zinc-50 p-2 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-zinc-800">Диагностика</span>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-blue-600 hover:text-blue-800"
        >
          Свернуть
        </button>
      </div>
      
      {cell.redirectChain && cell.redirectChain.length > 0 && (
        <div>
          <div className="font-medium text-zinc-700 mb-1">Цепочка редиректов:</div>
          <div className="space-y-1 pl-2">
            {cell.redirectChain.map((step, idx) => (
              <div key={idx} className="text-zinc-600">
                {step.from} → {step.to} ({step.status})
              </div>
            ))}
          </div>
        </div>
      )}
      
      {cell.traceHeaders && Object.keys(cell.traceHeaders).length > 0 && (
        <div>
          <div className="font-medium text-zinc-700 mb-1">Заголовки:</div>
          <div className="space-y-1 pl-2">
            {Object.entries(cell.traceHeaders).map(([key, value]) => (
              <div key={key} className="text-zinc-600">
                <span className="font-mono">{key}:</span> {value}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {cell.redirectTo && (
        <div className="text-zinc-600">
          <span className="font-medium">Redirect to:</span> {cell.redirectTo}
        </div>
      )}
    </div>
  );
}

type Role = "guest" | "resident" | "chairman" | "secretary" | "accountant" | "admin";
type Route = "/cabinet" | "/office" | "/admin" | "/login" | "/staff-login" | "/forbidden" | "/";

type TestResult = "ALLOW" | "LOGIN_REQUIRED" | "FORBIDDEN" | "SERVER_ERROR";

type RedirectStep = {
  from: string;
  to: string;
  status: number;
};

type MatrixCell = {
  result: TestResult | "PENDING";
  httpStatus: number | null;
  finalUrl: string;
  redirectTo?: string;
  reason?: string; // reason из /forbidden?reason=...
  redirectChain?: RedirectStep[]; // Цепочка редиректов
  loginType?: "login" | "staff-login" | null; // Тип логина если LOGIN_REQUIRED
  timingMs?: number; // Время выполнения запроса
  traceHeaders?: Record<string, string>; // Диагностические заголовки (x-auth-source, x-auth-reason, x-auth-guard, x-request-id)
  expected: TestResult;
  actual: TestResult | null;
  matchesExpected: boolean;
};

type MatrixResult = Record<Role, Record<Route, MatrixCell>>;

type ServerMatrixCell = {
  result?: TestResult;
  actual?: TestResult | null;
  httpStatus?: number | null;
  finalUrl?: string;
  redirectTo?: string;
  reason?: string;
  redirectChain?: RedirectStep[];
  loginType?: "login" | "staff-login" | null;
  timingMs?: number;
  traceHeaders?: Record<string, string>;
  expected?: TestResult;
  matchesExpected?: boolean;
};

const ROLES: Role[] = ["guest", "resident", "chairman", "secretary", "accountant", "admin"];
const ROUTES: Route[] = ["/cabinet", "/office", "/admin", "/login", "/staff-login", "/forbidden", "/"];

// Таблица ожиданий (синхронизирована с сервером)
const EXPECTED: Record<Role, Record<Route, TestResult>> = {
  guest: {
    "/cabinet": "LOGIN_REQUIRED",
    "/office": "LOGIN_REQUIRED",
    "/admin": "LOGIN_REQUIRED", // или FORBIDDEN в зависимости от политики
    "/login": "ALLOW",
    "/staff-login": "ALLOW",
    "/forbidden": "ALLOW",
    "/": "ALLOW",
  },
  resident: {
    "/cabinet": "ALLOW",
    "/office": "FORBIDDEN",
    "/admin": "FORBIDDEN",
    "/login": "ALLOW",
    "/staff-login": "ALLOW",
    "/forbidden": "ALLOW",
    "/": "ALLOW",
  },
  chairman: {
    "/cabinet": "ALLOW", // chairman имеет доступ в /cabinet и /office
    "/office": "ALLOW",
    "/admin": "FORBIDDEN", // но НЕ в /admin
    "/login": "ALLOW",
    "/staff-login": "ALLOW",
    "/forbidden": "ALLOW",
    "/": "ALLOW",
  },
  secretary: {
    "/cabinet": "ALLOW", // secretary имеет доступ в /cabinet и /office
    "/office": "ALLOW",
    "/admin": "FORBIDDEN", // но НЕ в /admin
    "/login": "ALLOW",
    "/staff-login": "ALLOW",
    "/forbidden": "ALLOW",
    "/": "ALLOW",
  },
  accountant: {
    "/cabinet": "ALLOW", // accountant имеет доступ в /cabinet и /office
    "/office": "ALLOW",
    "/admin": "FORBIDDEN", // но НЕ в /admin
    "/login": "ALLOW",
    "/staff-login": "ALLOW",
    "/forbidden": "ALLOW",
    "/": "ALLOW",
  },
  admin: {
    "/cabinet": "ALLOW", // admin имеет доступ ко всем разделам
    "/office": "ALLOW", // admin имеет доступ ко всем разделам
    "/admin": "ALLOW",
    "/login": "ALLOW",
    "/staff-login": "ALLOW",
    "/forbidden": "ALLOW",
    "/": "ALLOW",
  },
};


type QaMatrixCardProps = {
  enableQa?: boolean;
  nodeEnv?: string;
};

type SessionContext = {
  currentSessionRole: string | null;
  effectiveRole: string | null;
  normalizedRole: string | null;
  sessionSource: "cookie" | "qa" | "none";
  cookiePresent: {
    snt_session: boolean;
    qaCookie: boolean;
  };
};

export default function QaMatrixCard({ enableQa = true, nodeEnv }: QaMatrixCardProps) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MatrixResult | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [status, setStatus] = useState<{ type: "idle" | "loading" | "success" | "error"; message?: string }>({
    type: "idle",
  });
  const [isQaDisabled, setIsQaDisabled] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [sessionContext, setSessionContext] = useState<SessionContext | null>(null);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    const checkQaEnabled = () => {
      if (nodeEnv === "production" && enableQa !== true) {
        setIsQaDisabled(true);
        return;
      }
      setIsQaDisabled(false);
    };
    checkQaEnabled();
  }, [enableQa, nodeEnv]);

  const runMatrix = async () => {
    setLoading(true);
    setResults(null);
    setStatus({ type: "loading", message: qaText.messages.matrixRunning });

    // Инициализируем матрицу с PENDING
    const matrix: MatrixResult = {} as MatrixResult;
    for (const role of ROLES) {
      matrix[role] = {} as Record<Route, MatrixCell>;
      for (const route of ROUTES) {
        const expected = EXPECTED[role][route];
        matrix[role][route] = {
          result: "PENDING",
          httpStatus: null,
          finalUrl: route,
          expected,
          actual: null,
          matchesExpected: false,
        };
      }
    }
    setResults(matrix);

    const totalChecks = ROLES.length * ROUTES.length;
    setProgress({ current: 0, total: totalChecks });

    type FirstError = { status?: number; url?: string; message: string };
    let firstError: FirstError | null = null;

    try {
      // Создаём AbortController для таймаута
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 15000); // 15 секунд таймаут

      let fetchError: Error | null = null;
      try {
        // Вызываем серверный endpoint для выполнения проверок
        const response = await fetch("/api/admin/qa/run-access-matrix", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        let data: { results?: Record<string, Record<string, ServerMatrixCell>>; sessionContext?: SessionContext } | null = null;
        try {
          data = await readOk<{ results?: Record<string, Record<string, ServerMatrixCell>>; sessionContext?: SessionContext }>(response);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Server returned error";
          const status = error instanceof ApiError ? error.status : response.status;
          firstError = { status, url: response.url, message };
          fetchError = new Error(message);
          throw fetchError;
        }

        if (!data?.results) {
          const invalidResponseMessage = "Invalid response from server";
          firstError = { url: "/api/admin/qa/run-access-matrix", message: invalidResponseMessage };
          fetchError = new Error(invalidResponseMessage);
          throw fetchError;
        }

        // Сохраняем sessionContext
        if (data.sessionContext) {
          setSessionContext(data.sessionContext);
        }

        // Преобразуем результаты сервера в формат UI
        const serverResults = data.results;
        let completedCount = 0;
        for (const role of ROLES) {
          for (const route of ROUTES) {
            const serverCell = serverResults[role]?.[route];
            if (serverCell) {
              // Используем actual result из сервера (он всегда валидный TestResult)
              // UNEXPECTED показывается только в UI когда matchesExpected = false
              const displayResult = serverCell.actual || serverCell.result || "SERVER_ERROR";
              const expected = EXPECTED[role][route];
              const matchesExpected =
                serverCell.matchesExpected ?? (serverCell.actual ? serverCell.actual === expected : true);
              matrix[role][route] = {
                result: displayResult,
                httpStatus: serverCell.httpStatus ?? null,
                finalUrl: serverCell.finalUrl || "",
                redirectTo: serverCell.redirectTo,
                reason: serverCell.reason,
                redirectChain: serverCell.redirectChain || [],
                loginType: serverCell.loginType || null,
                timingMs: serverCell.timingMs,
                traceHeaders: serverCell.traceHeaders || {},
                expected,
                actual: serverCell.actual ?? null,
                matchesExpected,
              };
              const resultStatus: TestResult | "PENDING" = serverCell.result ?? "PENDING";
              // Считаем завершённые проверки (не PENDING)
              if (resultStatus !== "PENDING") {
                completedCount++;
              }
            }
          }
        }
        
        // Обновляем прогресс
        setProgress({ current: completedCount, total: totalChecks });

        setResults({ ...matrix });
        setStatus({ type: "success", message: qaText.messages.matrixSuccess });

        // Сохраняем результаты в localStorage
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem("qa-matrix-results", JSON.stringify(matrix));
          } catch {
            // Ignore
          }
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === "AbortError") {
          // Таймаут
          const timeoutErrorMessage = "Превышено время ожидания (15 секунд)";
          firstError = { url: "/api/admin/qa/run-access-matrix", message: timeoutErrorMessage };
          
          // Помечаем все ячейки как таймаут
          for (const role of ROLES) {
            for (const route of ROUTES) {
              if (matrix[role][route].result === "PENDING") {
                const expected = matrix[role][route].expected;
                matrix[role][route] = {
                  ...matrix[role][route],
                  result: "SERVER_ERROR",
                  actual: "SERVER_ERROR",
                  matchesExpected: expected === "SERVER_ERROR",
                };
              }
            }
          }
          setResults({ ...matrix });
          setStatus({ 
            type: "error", 
            message: `Не удалось выполнить запросы: ${timeoutErrorMessage}` 
          });
          return; // Выходим из функции, не попадая в внешний catch
        } else {
          throw fetchError;
        }
      }
    } catch (error) {
      // Логируем первую ошибку в консоль
      const caughtErrorMessage = error instanceof Error ? error.message : String(error);
      if (!firstError) {
        firstError = { message: caughtErrorMessage };
      }
      
      console.error("[matrix] Первая ошибка:", {
        status: firstError.status,
        url: firstError.url,
        message: firstError.message,
        error,
      });

      // Помечаем все PENDING ячейки как ошибку
      for (const role of ROLES) {
        for (const route of ROUTES) {
          if (matrix[role][route].result === "PENDING") {
            const expected = matrix[role][route].expected;
            matrix[role][route] = {
              ...matrix[role][route],
              result: "SERVER_ERROR",
              actual: "SERVER_ERROR",
              matchesExpected: expected === "SERVER_ERROR",
            };
          }
        }
      }
      setResults({ ...matrix });
      
      const finalErrorMessage = firstError?.message || caughtErrorMessage;
      setStatus({ 
        type: "error", 
        message: `Не удалось выполнить запросы: ${finalErrorMessage}` 
      });
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResults(null);
    setStatus({ type: "idle" });
    setCurrentRole(null);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem("qa-matrix-results");
      } catch {
        // ignore
      }
    }
  };

  // Генерация JSON отчёта
  const generateReport = async (): Promise<string> => {
    if (!results) {
      throw new Error("Нет результатов для генерации отчёта");
    }

    // Получаем build info
    let buildInfo: { sha?: string; builtAt?: string } = {};
    try {
      buildInfo = await apiGetRaw("/admin/build-info");
    } catch {
      // Ignore
    }

    // Формируем результаты в плоском формате
    const reportResults: Array<{
      role: Role;
      route: Route;
      expected: TestResult;
      actual: TestResult | "PENDING" | "UNEXPECTED" | null;
      status: number | null;
      finalUrl: string;
      forbiddenReason: string | null;
      authSource: string | null;
      redirectChain: Array<{ from: string; to: string; status: number }>;
      timingMs: number | null;
      notes?: string;
    }> = [];

    for (const role of ROLES) {
      for (const route of ROUTES) {
        const cell = results[role]?.[route];
        if (!cell) continue;

        const authSource = cell.traceHeaders?.["x-auth-source"] || null;
        const notes: string[] = [];
        if (!cell.matchesExpected) {
          notes.push(`Ожидалось: ${cell.expected}, получено: ${cell.actual || "null"}`);
        }
        if (cell.loginType) {
          notes.push(`Тип логина: ${cell.loginType}`);
        }

        reportResults.push({
          role,
          route,
          expected: cell.expected,
          actual: cell.actual,
          status: cell.httpStatus,
          finalUrl: cell.finalUrl,
          forbiddenReason: cell.reason || null,
          authSource,
          redirectChain: cell.redirectChain || [],
          timingMs: cell.timingMs || null,
          notes: notes.length > 0 ? notes.join("; ") : undefined,
        });
      }
    }

    const report = {
      generatedAt: new Date().toISOString(),
      app: {
        env: nodeEnv || process.env.NODE_ENV || "unknown",
        build: buildInfo.builtAt || null,
        commit: buildInfo.sha || null,
      },
      sessionContext: sessionContext || {
        currentSessionRole: null,
        effectiveRole: null,
        normalizedRole: null,
        sessionSource: "none",
        cookiePresent: {
          snt_session: false,
          qaCookie: false,
        },
      },
      matrix: {
        routes: ROUTES,
        roles: ROLES,
        results: reportResults,
      },
    };

    return JSON.stringify(report, null, 2);
  };

  const handleCopyReport = async () => {
    if (!results) {
      return;
    }

    try {
      const reportJson = await generateReport();

      // Пытаемся скопировать в clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(reportJson);
        showToast("Отчёт скопирован");
      } else {
        // Fallback: открываем modal
        setReportJsonForModal(reportJson);
        setShowCopyModal(true);
      }
    } catch (error) {
      console.error("Failed to generate report:", error);
      // Fallback: открываем modal
      try {
        const reportJson = await generateReport();
        setReportJsonForModal(reportJson);
        setShowCopyModal(true);
      } catch (err) {
        console.error("Failed to generate report for modal:", err);
      }
    }
  };

  const handleDownloadReport = async () => {
    if (!results) {
      return;
    }

    try {
      const reportJson = await generateReport();
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
      downloadJson(reportJson, `access-matrix-report-${timestamp}.json`);
      showToast("Отчёт скачан");
    } catch (error) {
      console.error("Failed to download report:", error);
    }
  };

  const getResultColor = (cell: MatrixCell) => {
    // Если результат не соответствует ожидаемому - красный цвет
    if (cell.result !== "PENDING" && !cell.matchesExpected && cell.actual !== null) {
      return "bg-red-100 text-red-800";
    }
    
    switch (cell.result) {
      case "ALLOW":
        return "bg-green-100 text-green-800";
      case "LOGIN_REQUIRED":
        return "bg-blue-100 text-blue-800";
      case "FORBIDDEN":
        return "bg-amber-100 text-amber-800";
      case "SERVER_ERROR":
        return "bg-red-100 text-red-800";
      case "PENDING":
        // Нейтральный цвет для PENDING (не красный)
        return "bg-zinc-100 text-zinc-600";
      default:
        return "bg-gray-100 text-gray-500";
    }
  };

  const getResultLabel = (cell: MatrixCell): string => {
    // Если результат не соответствует ожидаемому - показываем "Неожиданно"
    if (cell.result !== "PENDING" && !cell.matchesExpected && cell.actual !== null) {
      return "Неожиданно";
    }
    
    switch (cell.result) {
      case "ALLOW":
        return "Доступ есть";
      case "LOGIN_REQUIRED":
        return "Требуется вход";
      case "FORBIDDEN":
        return "Доступ запрещён";
      case "SERVER_ERROR":
        return "Ошибка сервера";
      case "PENDING":
        return "Проверка...";
      default:
        return "Неизвестно";
    }
  };

  const formatExpected = (expected: TestResult): string => {
    switch (expected) {
      case "ALLOW":
        return "Доступ есть";
      case "LOGIN_REQUIRED":
        return "Требуется вход";
      case "FORBIDDEN":
        return "Доступ запрещён";
      case "SERVER_ERROR":
        return "Ошибка сервера";
      default:
        return String(expected);
    }
  };

  const renderBanner = () => {
    if (status.type === "idle") return null;
    const map = {
      loading: "border-blue-200 bg-blue-50 text-blue-800",
      success: "border-green-200 bg-green-50 text-green-800",
      error: "border-red-200 bg-red-50 text-red-800",
    } as const;
    const cls = status.type === "loading" ? map.loading : status.type === "success" ? map.success : map.error;
    return (
      <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${cls}`}>
        {status.message || qaText.messages.success}
      </div>
    );
  };

  const [reportJsonForModal, setReportJsonForModal] = useState<string>("");

  if (isQaDisabled) {
    return (
      <section
        className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm opacity-60"
        data-testid="qa-matrix-card"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-zinc-900">{qaText.headers.accessMatrix}</h2>
            <p className="text-xs text-red-600" data-testid="qa-help-matrix">
              {nodeEnv === "production"
                ? qaText.messages.qaDisabledProd
                : qaText.messages.qaDisabledEnv}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      {ToastComponent}
      <CopyReportModal
        open={showCopyModal}
        onClose={() => setShowCopyModal(false)}
        content={reportJsonForModal}
        testId="access-matrix-report-modal"
      />
      <section
        className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        data-testid="qa-matrix-card"
      >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-zinc-900">{qaText.headers.accessMatrix}</h2>
          <p className="text-xs text-zinc-500" data-testid="qa-help-matrix">
            {qaText.hints.matrix}
          </p>
          {currentRole && (
            <p className="text-xs text-zinc-600">
              {qaText.labels.currentRoleCoverage}: {currentRole}
            </p>
          )}
          {sessionContext && (
            <div className="text-xs text-zinc-600" data-testid="access-matrix-session-context">
              Текущая сессия:{" "}
              <span className="font-medium">
                {sessionContext.normalizedRole || sessionContext.currentSessionRole || "guest"}
              </span>
              {" "}(source: {sessionContext.sessionSource}), cookie: snt_session=
              {sessionContext.cookiePresent.snt_session ? "yes" : "no"}, qa=
              {sessionContext.cookiePresent.qaCookie ? "yes" : "no"}
            </div>
          )}
        </div>

        {renderBanner()}

        {loading && progress.total > 0 && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <div className="flex items-center gap-2">
              <span>Прогресс: {progress.current} / {progress.total}</span>
              <div className="flex-1 h-2 bg-blue-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {results ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border border-zinc-200 bg-zinc-50 px-2 py-2 text-left font-semibold text-zinc-900">
                    {qaText.labels.role} / {qaText.labels.route}
                  </th>
                  {ROUTES.map((route) => (
                    <th
                      key={route}
                      className="border border-zinc-200 bg-zinc-50 px-2 py-2 text-center font-semibold text-zinc-900"
                    >
                      {route}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROLES.map((role) => (
                  <tr key={role}>
                    <td className="border border-zinc-200 bg-zinc-50 px-2 py-2 font-medium text-zinc-800">
                      {role}
                    </td>
                    {ROUTES.map((route) => {
                      const cell = results[role][route];
                      return (
                        <td
                          key={route}
                          className="border border-zinc-200 px-2 py-2 text-center"
                          title={`${getResultLabel(cell)} (${cell.httpStatus || "—"}) → ${cell.finalUrl}`}
                        >
                          <div className="space-y-1">
                            {/* Индикатор совпадения с ожиданием - показываем только для завершённых проверок */}
                            {cell.result !== "PENDING" && cell.matchesExpected !== undefined && (
                              <div className="flex items-center justify-center">
                                {cell.matchesExpected ? (
                                  <span
                                    className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
                                    title="Соответствует ожиданиям"
                                  >
                                    <svg
                                      className="h-3 w-3"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                      aria-hidden="true"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                    ОК
                                  </span>
                                ) : (
                                  <span
                                    className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800"
                                    title={`Ожидалось: ${formatExpected(cell.expected)}`}
                                  >
                                    <svg
                                      className="h-3 w-3"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                      aria-hidden="true"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                      />
                                    </svg>
                                    ОШИБКА
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="flex items-center justify-center gap-1 flex-wrap">
                              <span
                                className={`inline-block rounded px-2 py-1 text-xs font-semibold ${getResultColor(cell)}`}
                              >
                                {getResultLabel(cell)}
                              </span>
                            </div>
                            {cell.result !== "PENDING" && !cell.matchesExpected && (
                              <div className="text-xs text-red-600 font-medium">
                                Ожидалось: {formatExpected(cell.expected)}
                              </div>
                            )}
                            {cell.result === "PENDING" && loading && (
                              <div className="text-xs text-zinc-500 italic">
                                Ожидание...
                              </div>
                            )}
                            {cell.result === "SERVER_ERROR" && cell.actual === "SERVER_ERROR" && !cell.httpStatus && (
                              <div className="text-xs text-red-600 font-medium">
                                Ошибка запроса
                              </div>
                            )}
                            {cell.httpStatus && (
                              <div className="text-xs text-zinc-500">HTTP {cell.httpStatus}</div>
                            )}
                            {cell.finalUrl && (
                              <div className="text-xs text-zinc-400" title={cell.finalUrl}>
                                URL: {cell.finalUrl.length > 20 ? `${cell.finalUrl.substring(0, 20)}...` : cell.finalUrl}
                              </div>
                            )}
                            {cell.reason && (
                              <div className="text-xs text-amber-600 font-medium">
                                Reason: {cell.reason}
                                {cell.traceHeaders?.["x-auth-source"] && (
                                  <span className="ml-1 text-zinc-500">
                                    (src: {cell.traceHeaders["x-auth-source"]})
                                  </span>
                                )}
                              </div>
                            )}
                            {cell.loginType && (
                              <div className="text-xs text-blue-600">
                                Login: {cell.loginType}
                              </div>
                            )}
                            {cell.timingMs !== undefined && (
                              <div className="text-xs text-zinc-400">
                                {cell.timingMs}ms
                              </div>
                            )}
                            {(cell.redirectChain && cell.redirectChain.length > 0) || 
                             (cell.traceHeaders && Object.keys(cell.traceHeaders).length > 0) ? (
                              <MatrixCellDetails cell={cell} />
                            ) : null}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-center">
            <div className="text-sm text-zinc-600">{qaText.messages.emptyMatrix}</div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={runMatrix}
              disabled={loading}
              data-testid="qa-run-matrix"
              className={primaryButtonClass}
              aria-label={loading ? "Матрица доступов строится" : "Запустить проверку матрицы доступов для всех ролей"}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {qaText.buttons.checking}
                </span>
              ) : (
                qaText.buttons.runMatrix
              )}
            </button>
            <button
              type="button"
              onClick={clearResults}
              disabled={loading || !results}
              data-testid="qa-clear-matrix"
              className={secondaryButtonClass}
              aria-label="Очистить результаты матрицы доступов"
            >
              {qaText.buttons.clearResults}
            </button>
            <button
              type="button"
              onClick={handleCopyReport}
              disabled={loading || !results}
              data-testid="access-matrix-copy-json"
              className={secondaryButtonClass}
              title={!results ? "Сначала запустите матрицу" : "Скопировать отчёт (JSON)"}
              aria-label="Скопировать отчёт матрицы доступов в формате JSON"
            >
              Скопировать отчёт (JSON)
            </button>
            {results && (
              <button
                type="button"
                onClick={handleDownloadReport}
                disabled={loading}
                data-testid="access-matrix-download-json"
                className={secondaryButtonClass}
                aria-label="Скачать отчёт матрицы доступов"
              >
                Скачать .json
              </button>
            )}
          </div>
          {status.type !== "idle" && <span className="text-xs text-zinc-500">{status.message}</span>}
        </div>
      </div>
    </section>
    </>
  );
}
