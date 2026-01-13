"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  scenario: string | null;
};

/**
 * QA components must stay admin-only to avoid RSC leaks.
 */
export default function AdminQaBanner({ scenario }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  if (!scenario) return null;

  const handleClear = async () => {
    try {
      setLoading(true);
<<<<<<< HEAD
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
    } finally {
      setLoading(false);
      // Hard reload to ensure all state is cleared and banners disappear
      window.location.assign("/admin/qa");
=======
      await fetch("/api/admin/qa/clear", { method: "POST" });
    } finally {
      setLoading(false);
      router.refresh();
>>>>>>> 737c5be (codex snapshot)
    }
  };

  return (
    <div
      className="w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 sm:w-auto"
      data-testid="qa-banner"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">QA-режим: Просмотр как {scenario}</span>
        <button
          type="button"
          onClick={handleClear}
          disabled={loading}
          className="rounded-full border border-amber-300 px-3 py-1 text-xs font-semibold hover:border-amber-400 disabled:opacity-60"
          data-testid="qa-return-admin"
        >
          Вернуться в админ
        </button>
      </div>
    </div>
  );
}
