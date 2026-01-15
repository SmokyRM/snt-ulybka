"use client";

import { useEffect, useState } from "react";
import ForbiddenCtas from "./forbidden/ForbiddenCtas";
import { normalizeRole } from "@/lib/rbac";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorProps) {
  const isDev = process.env.NODE_ENV !== "production";
  const [userRole, setUserRole] = useState<string | null>(null);
  
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
    
    console.error("[app-error]", {
      requestId: requestId || "unknown",
      route,
      error: error.message,
      stack: error.stack,
    });

    // Пытаемся получить роль из сессии (если доступна)
    // Используем setTimeout чтобы избежать setState в эффекте
    const timer = setTimeout(() => {
      try {
        const sessionData = document.cookie.split(";").find((c) => c.trim().startsWith("snt_session="));
        if (sessionData) {
          // Простая попытка извлечь роль (не полная парсинг, но достаточно для UI)
          const roleMatch = sessionData.match(/role[":=]([^,;"]+)/i);
          if (roleMatch) {
            setUserRole(roleMatch[1].trim());
          }
        }
      } catch {
        // ignore
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [error, requestId]);

  const normalizedRole = normalizeRole(userRole);
  const canAccessAdmin = normalizedRole === "admin";
  const canAccessOffice =
    normalizedRole === "admin" ||
    normalizedRole === "chairman" ||
    normalizedRole === "secretary" ||
    normalizedRole === "accountant";

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-16 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-2xl rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Что-то пошло не так</h1>
        <p className="mt-3 text-sm text-zinc-700">
          Мы уже знаем о проблеме. Попробуйте обновить страницу или вернуться на главную.
        </p>
        {isDev && requestId && (
          <p className="mt-2 text-xs text-zinc-500">
            Request-ID: <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono">{requestId}</code>
          </p>
        )}
        <div className="mt-6">
          <ForbiddenCtas 
            canAccessAdmin={canAccessAdmin} 
            canAccessOffice={canAccessOffice}
            showQaCabinetButton={false}
          />
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              onClick={() => reset()}
              className="rounded-full bg-[#5E704F] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41]"
            >
              Повторить
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
