"use client";

import Link from "next/link";
import { useEffect } from "react";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function OfficeError({ error, reset }: ErrorProps) {
  const isDev = process.env.NODE_ENV !== "production";
  
  // Получаем request-id один раз при рендере
  const requestId = (() => {
    if (typeof window === "undefined") return null;
    try {
      const checksStr = window.localStorage.getItem("qa-checks-results");
      if (checksStr) {
        const checks = JSON.parse(checksStr) as Array<{ requestId?: string }>;
        return checks.find((c) => c.requestId)?.requestId ?? null;
      }
    } catch {
      // ignore
    }
    return null;
  })();

  useEffect(() => {
    const route = typeof window !== "undefined" ? window.location.pathname : "unknown";
    
    console.error("[office-error]", {
      requestId: requestId || "unknown",
      route,
      error: error.message,
      stack: error.stack,
    });
  }, [error, requestId]);

  // Безопасное отображение ошибки (без утечки секретов)
  const errorMessage = isDev 
    ? error.message 
    : "Произошла ошибка при загрузке страницы";

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-16 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-2xl rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Ошибка в кабинете правления</h1>
        <p className="mt-3 text-sm text-zinc-700">
          {errorMessage}
        </p>
        {isDev && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-xs">
            <div className="font-semibold text-red-800">Детали ошибки (только в dev):</div>
            <div className="mt-2 font-mono text-red-700 break-all">{error.message}</div>
            {error.stack && (
              <details className="mt-2">
                <summary className="cursor-pointer text-red-600">Stack trace</summary>
                <pre className="mt-2 whitespace-pre-wrap text-red-600 text-[10px] overflow-auto max-h-60">
                  {error.stack}
                </pre>
              </details>
            )}
            {requestId && (
              <div className="mt-2 text-red-600">
                Request-ID: <code className="rounded bg-red-100 px-1 py-0.5">{requestId}</code>
              </div>
            )}
          </div>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-full bg-[#5E704F] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41]"
          >
            Повторить
          </button>
          <Link
            href="/"
            className="rounded-full border border-[#5E704F] px-5 py-2 text-sm font-semibold text-[#5E704F] transition-colors hover:bg-[#5E704F] hover:text-white"
          >
            На главную
          </Link>
          <Link
            href="/staff-login"
            className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Войти как сотрудник
          </Link>
        </div>
      </div>
    </main>
  );
}
