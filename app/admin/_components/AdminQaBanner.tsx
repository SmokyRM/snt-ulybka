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
      await fetch("/api/admin/qa/clear", { method: "POST" });
    } finally {
      setLoading(false);
      router.refresh();
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
