"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { qaText } from "@/lib/qaText";

type QaDebugActionsProps = {
  envInfo: {
    NODE_ENV: string | undefined;
    ENABLE_QA: string | undefined;
    NEXT_PUBLIC_APP_VERSION?: string;
    GIT_SHA?: string;
  };
  sessionSnapshot: {
    role?: string;
    userId?: string;
    fullName?: string;
    email?: string;
    phone?: string;
    isQaOverride?: boolean;
    qaScenario?: string | null;
    realRole?: string;
    isImpersonating?: boolean;
  };
  checksResults?: Array<{
    name: string;
    url: string;
    status: number | null;
    statusText: string;
    timeMs: number;
    error?: string;
  }>;
};

export default function QaDebugActions({
  envInfo,
  sessionSnapshot,
  checksResults,
}: QaDebugActionsProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleCopyDebug = async () => {
    const debugReport = {
      timestamp: new Date().toISOString(),
      url: typeof window !== "undefined" ? window.location.href : "—",
      env: envInfo,
      session: sessionSnapshot,
      checks: checksResults || [],
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(debugReport, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback для старых браузеров
      const textArea = document.createElement("textarea");
      textArea.value = JSON.stringify(debugReport, null, 2);
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

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      // Вызываем logout endpoint
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore errors, proceed to redirect
    }

    // Очищаем localStorage QA ключи если они есть
    if (typeof window !== "undefined") {
      try {
        const keys = Object.keys(window.localStorage).filter((key) => {
          const lower = key.toLowerCase();
          return lower.includes("qa") || lower.includes("admin_view");
        });
        keys.forEach((key) => window.localStorage.removeItem(key));
      } catch {
        // Ignore storage errors
      }
    }

    // Редирект на логин
    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={handleCopyDebug}
        data-testid="qa-copy-debug"
        className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-[#5E704F] hover:bg-[#5E704F]/5 hover:text-[#5E704F] focus:outline-none focus:ring-2 focus:ring-[#5E704F] focus:ring-offset-1"
        aria-label={copied ? "Отчёт диагностики скопирован" : "Скопировать отчёт диагностики"}
        aria-live="polite"
      >
        {copied ? qaText.buttons.copied : qaText.buttons.copyDebugReport}
      </button>
      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        data-testid="qa-logout"
        className="rounded-full border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:border-red-400 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
        aria-label={loggingOut ? "Выход выполняется" : "Выйти и сбросить сессию"}
      >
        {loggingOut ? qaText.buttons.loggingOut : qaText.buttons.logout}
      </button>
    </div>
  );
}
