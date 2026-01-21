"use client";

/**
 * Client-only empty state с onAction (открытие модалки, trigger и т.п.).
 * Server Components — используйте EmptyStateCard с actionHref.
 */
type EmptyStateCardClientProps = {
  title: string;
  description?: string;
  actionLabel: string;
  onAction: () => void;
};

export default function EmptyStateCardClient({
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateCardClientProps) {
  const btnClass =
    "mt-4 rounded-full border border-[#5E704F] px-4 py-2 text-xs font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white";
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-700 shadow-sm">
      <div className="text-base font-semibold text-zinc-900">{title}</div>
      {description ? <p className="mt-2 text-sm text-zinc-600">{description}</p> : null}
      <button type="button" onClick={onAction} className={btnClass}>
        {actionLabel}
      </button>
    </div>
  );
}
