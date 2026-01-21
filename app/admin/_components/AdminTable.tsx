"use client";

import type { ReactNode } from "react";
import EmptyStateCard from "@/components/EmptyStateCard";

type AdminTableProps = {
  headers: Array<{ label: string; className?: string; align?: "left" | "right" | "center" }>;
  rows: ReactNode[];
  /** Только serializable: actionHref для ссылки. Для интерактива (onClick/модалка) — рендерьте empty state в своём Client Component. */
  emptyState?: {
    title: string;
    description?: string;
    actionLabel?: string;
    actionHref?: string;
  };
  className?: string;
};

export default function AdminTable({ headers, rows, emptyState, className = "" }: AdminTableProps) {
  return (
    <div className={`overflow-x-auto rounded-lg border border-zinc-200 bg-white ${className}`}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50">
            {headers.map((header, idx) => (
              <th
                key={idx}
                className={`px-4 py-3 text-left font-semibold text-zinc-700 ${
                  header.align === "right" ? "text-right" : header.align === "center" ? "text-center" : ""
                } ${header.className || ""}`}
              >
                {header.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows
          ) : emptyState ? (
            <tr>
              <td colSpan={headers.length} className="px-4 py-6">
                <EmptyStateCard
                  title={emptyState.title}
                  description={emptyState.description}
                  actionLabel={emptyState.actionLabel}
                  actionHref={emptyState.actionHref}
                />
              </td>
            </tr>
          ) : (
            <tr>
              <td colSpan={headers.length} className="px-4 py-6 text-center text-sm text-zinc-600">
                Нет данных
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
