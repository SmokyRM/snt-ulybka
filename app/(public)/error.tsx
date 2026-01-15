"use client";

import Link from "next/link";
import { useEffect } from "react";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function PublicError({ error, reset }: ErrorProps) {
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
    
    console.error("[public-error]", {
      requestId: requestId || "unknown",
      route,
      error: error.message,
      stack: error.stack,
    });
  }, [error, requestId]);

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-16 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-2xl rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Что-то пошло не так на публичной странице</h1>
        <p className="mt-3 text-sm text-zinc-700">
          Возможно, это временный сбой. Попробуйте обновить страницу или вернуться на главную.
        </p>
        {isDev && requestId && (
          <p className="mt-2 text-xs text-zinc-500">
            Request-ID: <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono">{requestId}</code>
          </p>
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
        </div>
      </div>
    </main>
  );
}

