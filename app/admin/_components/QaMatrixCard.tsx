"use client";

import { useState, useEffect } from "react";
import { qaText } from "@/lib/qaText";
import { primaryButtonClass, secondaryButtonClass } from "./qaStyles";
import { fetchWithTimeout, createRequestPool, isNetworkError } from "./QaFetchUtils";

type Role = "guest" | "resident" | "chairman" | "secretary" | "accountant" | "admin";
type Route = "/cabinet" | "/office" | "/admin" | "/login" | "/staff-login" | "/forbidden" | "/";

type MatrixCell = {
  status: "OK" | "LOGIN" | "FORBIDDEN" | "NOT_FOUND" | "UNEXPECTED" | "PENDING" | "SERVER_ERROR";
  httpStatus: number | null;
  finalUrl: string;
  redirectTo?: string;
  isRedirect?: boolean;
  expected?: ExpectedOutcome;
  actual?: ExpectedOutcome;
  matchesExpected?: boolean;
};

type MatrixResult = Record<Role, Record<Route, MatrixCell>>;

const ROLES: Role[] = ["guest", "resident", "chairman", "secretary", "accountant", "admin"];
const ROUTES: Route[] = ["/cabinet", "/office", "/admin", "/login", "/staff-login", "/forbidden", "/"];

// Таблица ожиданий: expected[role][route] = "Доступ есть" | "Требуется вход" | "Доступ запрещён"
type ExpectedOutcome = "Доступ есть" | "Требуется вход" | "Доступ запрещён";
const EXPECTED: Record<Role, Record<Route, ExpectedOutcome>> = {
  guest: {
    "/cabinet": "Требуется вход",
    "/office": "Требуется вход",
    "/admin": "Требуется вход",
    "/login": "Доступ есть",
    "/staff-login": "Доступ есть",
    "/forbidden": "Доступ есть",
    "/": "Доступ есть",
  },
  resident: {
    "/cabinet": "Доступ есть",
    "/office": "Доступ запрещён",
    "/admin": "Доступ запрещён",
    "/login": "Доступ есть",
    "/staff-login": "Доступ есть",
    "/forbidden": "Доступ есть",
    "/": "Доступ есть",
  },
  chairman: {
    "/cabinet": "Доступ запрещён",
    "/office": "Доступ есть",
    "/admin": "Доступ запрещён",
    "/login": "Доступ есть",
    "/staff-login": "Доступ есть",
    "/forbidden": "Доступ есть",
    "/": "Доступ есть",
  },
  secretary: {
    "/cabinet": "Доступ запрещён",
    "/office": "Доступ есть",
    "/admin": "Доступ запрещён",
    "/login": "Доступ есть",
    "/staff-login": "Доступ есть",
    "/forbidden": "Доступ есть",
    "/": "Доступ есть",
  },
  accountant: {
    "/cabinet": "Доступ запрещён",
    "/office": "Доступ есть",
    "/admin": "Доступ запрещён",
    "/login": "Доступ есть",
    "/staff-login": "Доступ есть",
    "/forbidden": "Доступ есть",
    "/": "Доступ есть",
  },
  admin: {
    "/cabinet": "Доступ запрещён",
    "/office": "Доступ запрещён",
    "/admin": "Доступ есть",
    "/login": "Доступ есть",
    "/staff-login": "Доступ есть",
    "/forbidden": "Доступ есть",
    "/": "Доступ есть",
  },
};

// Преобразует статус в ожидаемый формат для сравнения
const statusToExpected = (status: MatrixCell["status"]): ExpectedOutcome => {
  switch (status) {
    case "OK":
      return "Доступ есть";
    case "LOGIN":
      return "Требуется вход";
    case "FORBIDDEN":
      return "Доступ запрещён";
    case "NOT_FOUND":
      return "Доступ запрещён"; // 404 считается как запрет доступа
    case "SERVER_ERROR":
      return "Доступ запрещён"; // 500+ считается как проблема с доступом
    case "UNEXPECTED":
      return "Доступ запрещён"; // Неожиданный статус считается проблемой
    case "PENDING":
      return "Доступ запрещён"; // В процессе проверки считаем как проблему
    default:
      return "Доступ запрещён";
  }
};

const getStatusFromResponse = (
  status: number,
  finalUrl: string,
  route: Route,
  redirectTo?: string
): { status: MatrixCell["status"]; isRedirect: boolean } => {
  // Нормализуем finalUrl - убираем origin, оставляем только pathname (без query)
  const finalUrlObj = finalUrl.startsWith("http") 
    ? new URL(finalUrl) 
    : new URL(finalUrl, "http://localhost");
  const normalizedFinalUrl = finalUrlObj.pathname;
  
  // Нормализуем route - только pathname (без query)
  const routeObj = new URL(route, "http://localhost");
  const normalizedRoute = routeObj.pathname;

  // Правило 1: pathname finalUrl начинается с /forbidden -> "Доступ запрещён"
  if (normalizedFinalUrl.startsWith("/forbidden")) {
    return { status: "FORBIDDEN", isRedirect: false };
  }

  // Правило 2: pathname начинается с /login или /staff-login -> "Требуется вход"
  if (normalizedFinalUrl.startsWith("/login") || normalizedFinalUrl.startsWith("/staff-login")) {
    return { status: "LOGIN", isRedirect: false };
  }

  // Правило 3: статус 404 -> "Не найдено (404)"
  if (status === 404) {
    return { status: "NOT_FOUND", isRedirect: false };
  }

  // Правило 4: статус >= 500 -> "Ошибка сервера (500)"
  if (status >= 500) {
    return { status: "SERVER_ERROR", isRedirect: false };
  }

  // Правило 5: если pathname finalUrl == route pathname и статус 2xx -> "Доступ есть"
  if (normalizedFinalUrl === normalizedRoute && status >= 200 && status < 300) {
    return { status: "OK", isRedirect: false };
  }

  // Правило 6: если 30x и redirectTo ведёт в ожидаемое место (например /office -> /office/dashboard) -> "Доступ есть" (и пометка "Редирект")
  if (status >= 300 && status < 400 && redirectTo) {
    const redirectUrlObj = new URL(redirectTo, "http://localhost");
    const redirectPathname = redirectUrlObj.pathname;
    
    // Проверяем, ведёт ли редирект в ожидаемое место (например /office -> /office/dashboard)
    if (redirectPathname.startsWith(normalizedRoute) || normalizedRoute.startsWith(redirectPathname)) {
      return { status: "OK", isRedirect: true };
    }
    
    // Если редирект в /forbidden, /login, /staff-login - используем соответствующий статус
    if (redirectPathname.startsWith("/forbidden")) {
      return { status: "FORBIDDEN", isRedirect: true };
    }
    if (redirectPathname.startsWith("/login") || redirectPathname.startsWith("/staff-login")) {
      return { status: "LOGIN", isRedirect: true };
    }
  }

  // Правило 7: иначе -> "Неожиданно"
  return { status: "UNEXPECTED", isRedirect: status >= 300 && status < 400 };
};

type QaMatrixCardProps = {
  enableQa?: boolean;
  nodeEnv?: string;
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

    // Получаем текущую роль из сессии (если есть)
    // Используем document.cookie для чтения сессии, если доступно
    try {
      if (typeof document !== "undefined") {
        const cookies = document.cookie.split(";");
        const sessionCookie = cookies.find((c) => c.trim().startsWith("snt_session="));
        if (sessionCookie) {
          try {
            const sessionValue = sessionCookie.split("=")[1];
            const decoded = decodeURIComponent(sessionValue);
            const sessionData = JSON.parse(decoded);
            setCurrentRole(sessionData.role || null);
          } catch {
            // Ignore parsing errors
          }
        }
      }
    } catch {
      // Ignore
    }

    const matrix: MatrixResult = {} as MatrixResult;

    // Инициализируем матрицу
    for (const role of ROLES) {
        matrix[role] = {} as Record<Route, MatrixCell>;
      for (const route of ROUTES) {
        const expected = EXPECTED[role][route];
        matrix[role][route] = {
          status: "PENDING",
          httpStatus: null,
          finalUrl: route,
          isRedirect: false,
          expected,
          actual: statusToExpected("PENDING"),
          matchesExpected: false,
        };
      }
    }

    setResults(matrix);

    const totalChecks = ROLES.length * ROUTES.length;
    setProgress({ current: 0, total: totalChecks });

    const pool = createRequestPool(); // Используем дефолтный лимит (5)

    try {
      // Создаём все задачи проверки
      const checkTasks: Array<() => Promise<void>> = [];

      for (const role of ROLES) {
        for (const route of ROUTES) {
          checkTasks.push(async () => {
            const startTime = Date.now();
            try {
              const url = new URL(route, window.location.origin);
              if (role !== "guest") {
                url.searchParams.set("qa", role === "resident" ? "resident_ok" : role);
              }

              const response = await fetchWithTimeout(
                url.toString(),
                {
                  method: "HEAD",
                  redirect: "manual",
                  cache: "no-store",
                },
                7000
              ).catch(() =>
                fetchWithTimeout(
                  url.toString(),
                  {
                    method: "GET",
                    redirect: "manual",
                    cache: "no-store",
                  },
                  7000
                )
              );

              const statusCode = response.status;
              let redirectTo: string | undefined;
              let finalUrl: string;

              // Обрабатываем редиректы (30x статусы)
              if (statusCode >= 300 && statusCode < 400) {
                redirectTo = response.headers.get("Location") || undefined;
                if (redirectTo) {
                  // Если редирект относительный, делаем его абсолютным
                  try {
                    const redirectUrl = new URL(redirectTo, window.location.origin);
                    redirectTo = redirectUrl.pathname + redirectUrl.search;
                    finalUrl = redirectTo;
                  } catch {
                    // Если не удалось распарсить, пробуем использовать как есть
                    finalUrl = redirectTo.startsWith("/") ? redirectTo : `/${redirectTo}`;
                  }
                } else {
                  // Если Location header отсутствует, используем response.url
                  finalUrl = response.url;
                }
              } else {
                // Для не-редиректов используем response.url
                finalUrl = response.url;
              }

              // Нормализуем finalUrl - убираем origin, оставляем pathname + search
              let finalUrlPathname: string;
              let finalUrlFull: string;
              try {
                const finalUrlObj = new URL(finalUrl, window.location.origin);
                finalUrlPathname = finalUrlObj.pathname;
                finalUrlFull = finalUrlObj.pathname + finalUrlObj.search;
              } catch {
                // Если не удалось распарсить, используем как есть
                finalUrlPathname = finalUrl.startsWith("/") ? finalUrl.split("?")[0] : `/${finalUrl.split("?")[0]}`;
                finalUrlFull = finalUrl;
              }

              const { status, isRedirect } = getStatusFromResponse(
                statusCode,
                finalUrlPathname,
                route,
                redirectTo
              );

              const expected = EXPECTED[role][route];
              const actual = statusToExpected(status);
              const matchesExpected = expected === actual;

              matrix[role][route] = {
                status,
                httpStatus: statusCode,
                finalUrl: finalUrlFull,
                redirectTo,
                isRedirect: isRedirect || false,
                expected,
                actual,
                matchesExpected,
              };
            } catch (error) {
              // Определяем, является ли это сетевой ошибкой
              const isNetwork = isNetworkError(error);
              const expected = EXPECTED[role][route];
              const actual = statusToExpected("UNEXPECTED");
              matrix[role][route] = {
                status: "UNEXPECTED",
                httpStatus: null,
                finalUrl: route,
                isRedirect: false,
                expected,
                actual,
                matchesExpected: expected === actual,
              };
            }

            // Обновляем прогресс и результаты постепенно
            setProgress((prev) => {
              const newCurrent = prev.current + 1;
              return { current: newCurrent, total: prev.total };
            });
            setResults({ ...matrix });
          });
        }
      }

      // Выполняем все задачи через пул
      await Promise.all(checkTasks.map((task) => pool.add(task)));

      setStatus({ type: "success", message: qaText.messages.matrixSuccess });

      // Сохраняем результаты в localStorage для Bug Report Builder
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem("qa-matrix-results", JSON.stringify(matrix));
        } catch {
          // Ignore
        }
      }
    } catch {
      setStatus({ type: "error", message: qaText.messages.matrixError });
    } finally {
      setLoading(false);
      setProgress({ current: 0, total: 0 });
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

  const getStatusColor = (status: MatrixCell["status"]) => {
    switch (status) {
      case "OK":
        return "bg-green-100 text-green-800";
      case "LOGIN":
        return "bg-blue-100 text-blue-800";
      case "FORBIDDEN":
        return "bg-amber-100 text-amber-800";
      case "NOT_FOUND":
        return "bg-zinc-100 text-zinc-800";
      case "SERVER_ERROR":
        return "bg-red-100 text-red-800";
      case "UNEXPECTED":
        return "bg-red-100 text-red-800";
      case "PENDING":
        return "bg-gray-100 text-gray-500";
      default:
        return "bg-gray-100 text-gray-500";
    }
  };

  const getVerdictLabel = (status: MatrixCell["status"]): string => {
    switch (status) {
      case "OK":
        return qaText.verdicts.OK;
      case "LOGIN":
        return qaText.verdicts.LOGIN;
      case "FORBIDDEN":
        return qaText.verdicts.FORBIDDEN;
      case "NOT_FOUND":
        return qaText.verdicts.NOT_FOUND;
      case "SERVER_ERROR":
        return "Ошибка сервера (500)";
      case "UNEXPECTED":
        return qaText.verdicts.UNEXPECTED;
      case "PENDING":
        return qaText.verdicts.PENDING;
      default:
        return qaText.verdicts.UNEXPECTED;
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
                      // Сравниваем pathname без query параметров
                      const finalUrlPathname = cell.finalUrl.split("?")[0];
                      const routePathname = route.split("?")[0];
                      const isSamePath = finalUrlPathname === routePathname;
                      const displayUrl = cell.redirectTo || cell.finalUrl;
                      return (
                        <td
                          key={route}
                          className="border border-zinc-200 px-2 py-2 text-center"
                          title={`${getVerdictLabel(cell.status)} (${cell.httpStatus || qaText.misc.dash}) → ${displayUrl}`}
                        >
                          <div className="space-y-1">
                            {/* Индикатор совпадения с ожиданием */}
                            {cell.matchesExpected !== undefined && (
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
                                    title={`Ожидалось: ${cell.expected || "—"}`}
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
                                className={`inline-block rounded px-2 py-1 text-xs font-semibold ${getStatusColor(cell.status)}`}
                              >
                                {getVerdictLabel(cell.status)}
                              </span>
                              {cell.isRedirect && (
                                <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                                  Редирект
                                </span>
                              )}
                            </div>
                            {!cell.matchesExpected && cell.expected && (
                              <div className="text-xs text-red-600 font-medium">
                                Ожидалось: {cell.expected}
                              </div>
                            )}
                            {cell.httpStatus && <div className="text-xs text-zinc-500">{cell.httpStatus}</div>}
                            {displayUrl && (
                              <div className="flex items-center justify-center gap-1 flex-wrap">
                                <span className="text-xs text-zinc-400" title={displayUrl}>
                                  URL: {displayUrl.length > 15 ? `${displayUrl.substring(0, 15)}...` : displayUrl}
                                </span>
                                <a
                                  href={displayUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded bg-zinc-200 px-1.5 py-0.5 text-xs font-medium text-zinc-700 hover:bg-zinc-300 transition-colors"
                                  aria-label={`Открыть ${displayUrl} в новой вкладке`}
                                >
                                  Открыть
                                </a>
                              </div>
                            )}
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
          </div>
          {status.type !== "idle" && <span className="text-xs text-zinc-500">{status.message}</span>}
        </div>
      </div>
    </section>
  );
}
