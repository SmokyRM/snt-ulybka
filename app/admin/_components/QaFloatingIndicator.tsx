"use client";

import { useEffect, useState } from "react";
import { qaEnabled, QA_COOKIE, type QaScenario } from "@/lib/qaScenario";

const allowed: QaScenario[] = ["guest", "resident_ok", "resident_debtor", "admin"];

const readScenario = (): QaScenario | null => {
  const raw = typeof document !== "undefined" ? document.cookie : "";
  if (!raw) return null;
  const value = raw
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${QA_COOKIE}=`))
    ?.split("=")[1];
  if (value && allowed.includes(value as QaScenario)) return value as QaScenario;
  return null;
};

type Props = {
  role?: "admin" | "board" | "chair" | "accountant" | "operator" | "user" | "resident" | "chairman" | "secretary" | null;
};

export default function QaFloatingIndicator({ role }: Props) {
  const [scenario, setScenario] = useState<QaScenario | null>(null);

  useEffect(() => {
    if (!qaEnabled()) return;
    const update = () => setScenario(readScenario());
    update();
    const onFocus = () => update();
    const onVisibility = () => {
      if (document.visibilityState === "visible") update();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  if (!qaEnabled()) return null;
  if (!scenario) return null;
  const allowedRole =
    role === "admin" ||
    role === "board" ||
    role === "chair" ||
    role === "chairman" ||
    role === "secretary" ||
    role === "accountant" ||
    role === "operator";
  if (!allowedRole && role) return null;
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/admin")) {
    return null;
  }

  const handleClear = async () => {
    try {
      // Use reset endpoint to clear all QA-related cookies
      await fetch("/api/admin/qa/reset", { method: "POST" });
      // Clear any localStorage/sessionStorage QA keys
      if (typeof window !== "undefined") {
        try {
          const clearQaFromStorage = (storage: Storage | null | undefined) => {
            if (!storage) return;
            const keys = Object.keys(storage).filter((key) => {
              const lower = key.toLowerCase();
              return lower.includes("qa") || lower.includes("admin_view");
            });
            keys.forEach((key) => storage.removeItem(key));
          };
          clearQaFromStorage(window.localStorage);
          clearQaFromStorage(window.sessionStorage);
        } catch {
          // Ignore storage errors
        }
      }
      // Hard reload to ensure all state is cleared, without query params
      window.location.assign("/admin/qa");
    } catch {
      // Fallback: use query param approach via middleware
      // Navigate to /admin/qa?qa=clear, middleware will clear cookie and redirect to clean URL
      const url = new URL("/admin/qa", window.location.origin);
      url.searchParams.set("qa", "clear");
      window.location.href = url.toString();
      // Middleware will process qa=clear, set cookie deletion, and redirect to clean URL
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-[1200]" data-testid="qa-floating-indicator">
      <div className="flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 shadow-md">
        <span>QA: {scenario}</span>
        <button
          type="button"
          onClick={handleClear}
          data-testid="qa-floating-reset"
          className="rounded-full border border-amber-300 px-2 py-0.5 text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
        >
          Сбросить
        </button>
        <a
          href="/admin/qa"
          className="rounded-full border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
        >
          QA
        </a>
      </div>
    </div>
  );
}
