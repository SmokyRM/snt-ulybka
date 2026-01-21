"use client";

import type { ReactNode } from "react";

type AdminFiltersProps = {
  children: ReactNode;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onReset?: () => void;
  exportUrl?: string;
  exportLabel?: string;
  className?: string;
};

export default function AdminFilters({
  children,
  onSubmit,
  onReset,
  exportUrl,
  exportLabel = "Экспорт CSV",
  className = "",
}: AdminFiltersProps) {
  return (
    <form
      onSubmit={onSubmit}
      className={`rounded-lg border border-zinc-200 bg-white p-4 shadow-sm ${className}`}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="submit"
          className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41]"
        >
          Применить
        </button>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:border-zinc-400"
          >
            Сбросить
          </button>
        )}
        {exportUrl && (
          <a
            href={exportUrl}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:border-zinc-400"
          >
            {exportLabel}
          </a>
        )}
      </div>
    </form>
  );
}
