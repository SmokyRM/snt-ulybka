"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api/client";

export default function ForbiddenQaResetButton() {
  const [loading, setLoading] = useState(false);

  // В проде кнопку не показываем вовсе
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const handleClick = async () => {
    if (typeof window === "undefined") return;
    setLoading(true);
    try {
      await apiPost("/api/admin/qa/reset");
      // Clear localStorage and sessionStorage keys containing "qa" or "admin_view"
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
      window.location.assign("/admin/qa");
    } catch {
      // Fallback: navigate to /admin/qa?qa=clear
      const url = new URL("/admin/qa", window.location.origin);
      url.searchParams.set("qa", "clear");
      window.location.href = url.toString();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      data-testid="forbidden-qa-reset-dev"
      className="mt-2 inline-flex items-center justify-center rounded-full border border-amber-300 px-4 py-2 text-xs font-semibold text-amber-900 transition hover:border-amber-400 disabled:opacity-60"
    >
      {loading ? "Сброс..." : "Сбросить QA (dev)"}
    </button>
  );
}
