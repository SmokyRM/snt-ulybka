"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AdminError({ error, reset }: ErrorProps) {
  const isDev = process.env.NODE_ENV !== "production";
  const [route, setRoute] = useState<string>("");
  const [requestId, setRequestId] = useState<string | null>(null);

  useEffect(() => {
    // Initialize state from browser APIs on mount.
    // Schedule setState in microtask to avoid react-hooks/set-state-in-effect (sync setState in effect).
    const r = typeof window !== "undefined" ? window.location.pathname : "";
    let rid: string | null = null;
    try {
      const checksStr = typeof window !== "undefined" ? window.localStorage.getItem("qa-checks-results") : null;
      if (checksStr) {
        const checks = JSON.parse(checksStr) as Array<{ requestId?: string }>;
        rid = checks.find((c) => c.requestId)?.requestId ?? null;
      }
    } catch {
      // ignore
    }
    queueMicrotask(() => {
      setRoute(r);
      setRequestId(rid);
    });
  }, []);

  useEffect(() => {
    const msg = error?.message || "Unknown error";
    const r = route || (typeof window !== "undefined" ? window.location.pathname : "unknown");
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error("[admin-error] route=%s message=%s", r, msg, error?.stack ?? "");
    } else {
      // eslint-disable-next-line no-console
      console.error("[admin-error] route=%s message=%s", r, msg);
    }
  }, [error, route, isDev]);

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-16 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-2xl rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Что-то пошло не так</h1>
        <p className="mt-3 text-sm text-zinc-700">
          Сообщите администратору, указав адрес страницы и время. Попробуйте обновить страницу или вернуться на главную.
        </p>
        {route && (
          <p className="mt-2 text-xs text-zinc-500">
            Страница: <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono">{route}</code>
          </p>
        )}
        {(isDev ? requestId : null) && (
          <p className="mt-1 text-xs text-zinc-500">
            Request-ID: <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono">{requestId}</code>
          </p>
        )}
        {!requestId && (
          <p className="mt-1 text-xs text-zinc-500">
            Request-ID можно взять во вкладке «Сеть» (F12) по упавшему запросу.
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

