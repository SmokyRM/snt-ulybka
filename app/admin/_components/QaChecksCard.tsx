"use client";

import { useState, useEffect } from "react";
import { qaText } from "@/lib/qaText";
import { primaryButtonClass, secondaryButtonClass } from "./qaStyles";
import { fetchWithTimeout, createRequestPool, isNetworkError } from "./QaFetchUtils";

type CheckResult = {
  name: string;
  url: string;
  status: number | null;
  statusText: string;
  timeMs: number;
  error?: string;
  redirectTo?: string;
  finalVerdict?: string;
  requestId?: string;
};

type QaChecksCardProps = {
  enableQa?: boolean;
  nodeEnv?: string;
};

export default function QaChecksCard({ enableQa = true, nodeEnv }: QaChecksCardProps) {
  const [results, setResults] = useState<CheckResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [status, setStatus] = useState<{ type: "idle" | "loading" | "success" | "error"; message?: string }>({
    type: "idle",
  });
  const [isQaDisabled, setIsQaDisabled] = useState(false);

  useEffect(() => {
    // Проверяем доступность QA в клиенте
    const checkQaEnabled = () => {
      if (nodeEnv === "production" && enableQa !== true) {
        setIsQaDisabled(true);
        return;
      }
      setIsQaDisabled(false);
    };
    checkQaEnabled();
  }, [enableQa, nodeEnv]);

  const runChecks = async () => {
    setLoading(true);
    setResults([]);
    setProgress({ current: 0, total: 0 });
    setStatus({ type: "loading", message: qaText.messages.checksRunning });

    const checks: Array<{ name: string; url: string }> = [
      { name: "health", url: "/api/health" },
      { name: "cabinet", url: "/cabinet" },
      { name: "office", url: "/office" },
      { name: "admin", url: "/admin" },
    ];

    setProgress({ current: 0, total: checks.length });

    const pool = createRequestPool(); // Используем дефолтный лимит (5)

    try {
      const checkPromises = checks.map((check, index) =>
        pool.add(async (): Promise<CheckResult> => {
          setProgress({ current: index + 1, total: checks.length });
          return await runSingleCheck(check);
        })
      );

      const checkResults = await Promise.all(checkPromises);
      setResults(checkResults);
      setStatus({ type: "success", message: qaText.messages.checksSuccess(checkResults.length) });

      // Сохраняем результаты в localStorage для Bug Report Builder
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem("qa-checks-results", JSON.stringify(checkResults));
        } catch {
          // Ignore
        }
      }
    } catch {
      setStatus({ type: "error", message: qaText.messages.checksError });
    } finally {
      setLoading(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const runSingleCheck = async (check: { name: string; url: string }): Promise<CheckResult> => {
    const startTime = Date.now();
    try {
      // Специальная логика для health check с fallback на разные эндпоинты
      if (check.name === "health") {
        // По умолчанию стучимся в /api/healthz, далее пробуем остальные варианты
        const healthEndpoints = ["/api/healthz", "/api/health", "/api/ping", "/api/status"];
        let lastError: Error | null = null;

        for (const endpoint of healthEndpoints) {
          try {
            const response = await fetchWithTimeout(endpoint, {
              method: "GET",
              redirect: "manual",
              cache: "no-store",
            });
            const timeMs = Date.now() - startTime;

            // Если получили ответ (даже 404), считаем что эндпоинт существует
            if (response.status === 404) {
              // Продолжаем пробовать следующий эндпоинт
              continue;
            }

            let redirectTo: string | undefined;
            let finalVerdict: string | undefined;

            if (response.status >= 300 && response.status < 400) {
              redirectTo = response.headers.get("Location") || undefined;
              if (redirectTo) {
                try {
                  const redirectUrl = new URL(redirectTo, window.location.origin);
                  redirectTo = redirectUrl.pathname + redirectUrl.search;
                } catch {
                  // Ignore
                }
              }
              finalVerdict = redirectTo ? `Редирект → ${redirectTo}` : "Редирект";
            } else if (response.status >= 200 && response.status < 300) {
              finalVerdict = "Доступ есть";
            }

            const requestId = response.headers.get("x-request-id") || undefined;

            return {
              name: endpoint === "/api/healthz" ? "healthz" : endpoint === "/api/health" ? "health" : `health (${endpoint})`,
              url: endpoint,
              status: response.status,
              statusText: response.statusText,
              timeMs,
              redirectTo,
              finalVerdict,
              requestId,
            };
          } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            // Продолжаем пробовать следующий эндпоинт
            continue;
          }
        }

        // Если все эндпоинты вернули 404 или ошибку
        const timeMs = Date.now() - startTime;
        return {
          name: "health",
          url: "/api/health",
          status: 404,
          statusText: "Health эндпоинт не настроен",
          timeMs,
          finalVerdict: "Health эндпоинт не настроен",
        };
      }

      // Для остальных проверок используем fetch с redirect: "manual" для отслеживания редиректов
      const response = await fetchWithTimeout(
        check.url,
        {
          method: "HEAD",
          redirect: "manual",
          cache: "no-store",
        },
        7000
      ).catch(() =>
        fetchWithTimeout(
          check.url,
          {
            method: "GET",
            redirect: "manual",
            cache: "no-store",
          },
          7000
        )
      );

      const timeMs = Date.now() - startTime;
      let redirectTo: string | undefined;
      let finalVerdict: string | undefined;

      // Обрабатываем редиректы (30x статусы)
      if (response.status >= 300 && response.status < 400) {
        redirectTo = response.headers.get("Location") || undefined;
        if (redirectTo) {
          // Если редирект относительный, делаем его абсолютным
          try {
            const redirectUrl = new URL(redirectTo, window.location.origin);
            redirectTo = redirectUrl.pathname + redirectUrl.search;
          } catch {
            // Если не удалось распарсить, оставляем как есть
          }
        }
        finalVerdict = redirectTo ? `Редирект → ${redirectTo}` : "Редирект";
      } else if (response.status >= 200 && response.status < 300) {
        finalVerdict = "Доступ есть";
      } else if (response.status === 404) {
        finalVerdict = "Не найдено (404)";
      } else if (response.status >= 500) {
        finalVerdict = "Ошибка сервера (500)";
      } else if (response.status === 401 || response.status === 403) {
        finalVerdict = response.status === 403 ? "Доступ запрещён" : "Требуется вход";
      }

      const requestId = response.headers.get("x-request-id") || undefined;

      return {
        name: check.name,
        url: check.url,
        status: response.status,
        statusText: response.statusText,
        timeMs,
        redirectTo,
        finalVerdict,
        requestId,
      };
    } catch (error) {
      const timeMs = Date.now() - startTime;
      // Определяем, является ли это сетевой ошибкой (не 500)
      const isNetwork = isNetworkError(error);
      return {
        name: check.name,
        url: check.url,
        status: null,
        statusText: isNetwork ? "Сбой запроса" : qaText.verdicts.ERROR,
        timeMs,
        error: isNetwork ? "Сбой запроса" : error instanceof Error ? error.message : qaText.messages.networkError,
      };
    }
  };

  const clearResults = () => {
    setResults([]);
    setStatus({ type: "idle" });
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem("qa-checks-results");
      } catch {
        // ignore
      }
    }
  };

  const getStatusColor = (status: number | null, name: string) => {
    if (status === null) return "text-red-600";
    // Для health check с 404 показываем нейтрально
    if (name === "health" && status === 404) return "text-zinc-500";
    if (status >= 200 && status < 300) return "text-green-600";
    if (status >= 300 && status < 400) return "text-blue-600";
    if (status === 401 || status === 403) return "text-amber-600";
    if (status === 404) return "text-zinc-600";
    return "text-red-600";
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

  if (isQaDisabled) {
    return (
      <section
        className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm opacity-60"
        data-testid="qa-checks-card"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-zinc-900">{qaText.headers.checks}</h2>
            <p className="text-xs text-red-600" data-testid="qa-help-checks">
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
    <section
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
      data-testid="qa-checks-card"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-zinc-900">{qaText.headers.checks}</h2>
          <p className="text-xs text-zinc-500" data-testid="qa-help-checks">
            {qaText.hints.checks}
          </p>
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

        {results.length > 0 ? (
          <div className="space-y-2">
            {results.map((result) => (
              <div
                key={result.name}
                className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm"
                data-testid={`qa-check-row-${result.name}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-zinc-800">{result.name}:</span>
                    <code className="rounded bg-white px-2 py-1 font-mono text-xs text-zinc-900">
                      {result.url}
                    </code>
                  </div>
                  <div className="flex items-center gap-3">
                    {result.status !== null ? (
                      <>
                        <span className={`font-semibold ${getStatusColor(result.status, result.name)}`}>
                          {result.status} {result.statusText}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {result.timeMs}
                          {qaText.misc.ms}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-red-600">
                          {result.statusText === "Сбой запроса" ? "Сбой запроса" : qaText.verdicts.ERROR}
                        </span>
                        {result.error && (
                          <span className="text-xs text-red-600" title={result.error}>
                            {result.error.length > 30 ? `${result.error.substring(0, 30)}...` : result.error}
                          </span>
                        )}
                        <span className="text-xs text-zinc-500">
                          {result.timeMs}
                          {qaText.misc.ms}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {(result.redirectTo || result.finalVerdict) && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {result.status !== null && result.status >= 300 && result.status < 400 && result.redirectTo && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                        Редирект
                      </span>
                    )}
                    {result.finalVerdict && (
                      <span className="text-xs text-zinc-700">{result.finalVerdict}</span>
                    )}
                    {result.redirectTo && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-zinc-500">URL: {result.redirectTo}</span>
                        <a
                          href={result.redirectTo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded bg-zinc-200 px-1.5 py-0.5 text-xs font-medium text-zinc-700 hover:bg-zinc-300 transition-colors"
                          aria-label={`Открыть ${result.redirectTo} в новой вкладке`}
                        >
                          Открыть
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-center">
            <div className="text-sm text-zinc-600">{qaText.messages.emptyChecks}</div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={runChecks}
              disabled={loading}
              data-testid="qa-run-checks"
              className={primaryButtonClass}
              aria-label={loading ? "Проверки выполняются" : "Запустить проверки доступности эндпоинтов"}
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
                qaText.buttons.runChecks
              )}
            </button>
            <button
              type="button"
              onClick={clearResults}
              disabled={loading || results.length === 0}
              data-testid="qa-clear-checks"
              className={secondaryButtonClass}
              aria-label="Очистить результаты проверок"
            >
              {qaText.buttons.clearResults}
            </button>
          </div>
          {status.type !== "idle" && (
            <span className="text-xs text-zinc-500">{status.message}</span>
          )}
        </div>
      </div>
    </section>
  );
}
