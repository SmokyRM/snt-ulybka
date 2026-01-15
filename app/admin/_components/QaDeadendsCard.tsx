"use client";

import { useState, useEffect } from "react";
import { qaText } from "@/lib/qaText";
import { primaryButtonClass, secondaryButtonClass } from "./qaStyles";

type DeadendResult = {
  route: string;
  issue: "404" | "redirect_loop" | "unexpected_forbidden" | "unexpected_redirect";
  details: string;
  finalUrl?: string;
  redirectCount?: number;
};

const ROUTES_TO_CHECK = [
  "/",
  "/cabinet",
  "/cabinet/appeals",
  "/cabinet/templates",
  "/office",
  "/office/appeals",
  "/office/finance",
  "/admin",
  "/admin/billing",
  "/login",
  "/staff-login",
  "/forbidden",
  "/help",
  "/contacts",
];

type QaDeadendsCardProps = {
  enableQa?: boolean;
  nodeEnv?: string;
};

export default function QaDeadendsCard({ enableQa = true, nodeEnv }: QaDeadendsCardProps) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DeadendResult[]>([]);
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

  const runDeadendScan = async () => {
    setLoading(true);
    setResults([]);
    setStatus({ type: "loading", message: qaText.messages.deadendsRunning });

    const issues: DeadendResult[] = [];
    const MAX_REDIRECTS = 5;

    try {
      for (const route of ROUTES_TO_CHECK) {
        try {
          const url = new URL(route, window.location.origin);
          let currentUrl = url.toString();
          const visitedUrls = new Set<string>();
          let redirectCount = 0;
          let finalStatus = 0;
          let finalUrl = route;

          // Следуем редиректам вручную
          while (redirectCount < MAX_REDIRECTS) {
            if (visitedUrls.has(currentUrl)) {
              issues.push({
                route,
                issue: "redirect_loop",
                details: qaText.messages.deadendsLoop(redirectCount),
                redirectCount,
              });
              break;
            }
            visitedUrls.add(currentUrl);

            const response = await fetch(currentUrl, {
              method: "HEAD",
              redirect: "manual",
              cache: "no-store",
            }).catch(() =>
              fetch(currentUrl, {
                method: "GET",
                redirect: "manual",
                cache: "no-store",
              })
            );

            finalStatus = response.status;
            finalUrl = response.url.replace(window.location.origin, "");

            if (response.status >= 300 && response.status < 400) {
              const location = response.headers.get("location");
              if (location) {
                redirectCount++;
                currentUrl = new URL(location, currentUrl).toString();
                continue;
              }
            }

            // Проверяем результаты
            if (response.status === 404) {
              issues.push({
                route,
                issue: "404",
                details: qaText.misc.pageNotFound,
                finalUrl,
              });
            } else if (redirectCount >= MAX_REDIRECTS) {
              issues.push({
                route,
                issue: "redirect_loop",
                details: qaText.messages.deadendsTooManyRedirects(redirectCount),
                redirectCount,
                finalUrl,
              });
            } else if (finalUrl.includes("/forbidden") && !route.includes("/forbidden")) {
              issues.push({
                route,
                issue: "unexpected_forbidden",
                details: qaText.messages.deadendsUnexpectedForbidden,
                finalUrl,
              });
            } else if (finalUrl !== route && redirectCount > 0 && !finalUrl.includes("/login")) {
              // Проверяем на неожиданные редиректы (кроме логина)
              const isExpectedRedirect =
                (route.startsWith("/cabinet") && finalUrl.includes("/login")) ||
                (route.startsWith("/office") && finalUrl.includes("/staff-login")) ||
                (route.startsWith("/admin") && (finalUrl.includes("/login") || finalUrl.includes("/forbidden")));

              if (!isExpectedRedirect && redirectCount > 0) {
                issues.push({
                  route,
                  issue: "unexpected_redirect",
                  details: qaText.messages.deadendsUnexpectedRedirect(route, finalUrl),
                  finalUrl,
                  redirectCount,
                });
              }
            }

            break;
          }
        } catch (error) {
          issues.push({
            route,
            issue: "404",
            details: error instanceof Error ? error.message : qaText.messages.networkError,
          });
        }
      }

      setResults(issues);
      setStatus({ type: "success", message: qaText.messages.deadendsSuccess(issues.length) });
    } catch {
      setStatus({ type: "error", message: qaText.messages.deadendsError });
    } finally {
      setLoading(false);
      // Сохраняем результаты в localStorage для Bug Report Builder
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem("qa-deadends-results", JSON.stringify(issues));
        } catch {
          // Ignore
        }
      }
    }
  };

  const clearResults = () => {
    setResults([]);
    setStatus({ type: "idle" });
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem("qa-deadends-results");
      } catch {
        // ignore
      }
    }
  };

  const getIssueColor = (issue: DeadendResult["issue"]) => {
    switch (issue) {
      case "404":
        return "bg-zinc-100 text-zinc-800";
      case "redirect_loop":
        return "bg-red-100 text-red-800";
      case "unexpected_forbidden":
        return "bg-amber-100 text-amber-800";
      case "unexpected_redirect":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getIssueLabel = (issue: DeadendResult["issue"]): string => {
    switch (issue) {
      case "404":
        return qaText.verdicts.NOT_FOUND;
      case "redirect_loop":
        return qaText.misc.redirectLoop;
      case "unexpected_forbidden":
        return qaText.misc.unexpectedForbidden;
      case "unexpected_redirect":
        return qaText.verdicts.REDIRECT;
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

  return (
    <section
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
      data-testid="qa-deadends-card"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-zinc-900">{qaText.headers.deadendScan}</h2>
          <p className="text-xs text-zinc-500" data-testid="qa-help-deadends">
            {qaText.hints.deadends}
          </p>
        </div>

        {renderBanner()}

        {results.length > 0 ? (
          <div className="space-y-2">
            {results.map((result, idx) => (
              <div
                key={`${result.route}-${idx}`}
                className="flex items-start justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-800">{result.route}:</span>
                    <span className={`rounded px-2 py-1 text-xs font-semibold ${getIssueColor(result.issue)}`}>
                      {getIssueLabel(result.issue)}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-zinc-600">{result.details}</div>
                  {result.finalUrl && result.finalUrl !== result.route && (
                    <div className="mt-1 text-xs text-zinc-500">→ {result.finalUrl}</div>
                  )}
                  {result.redirectCount !== undefined && (
                    <div className="mt-1 text-xs text-zinc-500">
                      {qaText.misc.redirectsCount} {result.redirectCount}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-center">
            <div className="text-sm text-zinc-600">{qaText.messages.emptyDeadends}</div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={runDeadendScan}
              disabled={loading}
              data-testid="qa-run-deadends"
              className={primaryButtonClass}
              aria-label={loading ? "Проверка тупиков выполняется" : "Запустить проверку маршрутов на наличие тупиков и проблем"}
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
                qaText.buttons.runDeadendScan
              )}
            </button>
            <button
              type="button"
              onClick={clearResults}
              disabled={loading || results.length === 0}
              data-testid="qa-clear-deadends"
              className={secondaryButtonClass}
              aria-label="Очистить результаты проверки тупиков"
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
