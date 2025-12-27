"use client";

type EmptyStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-700 shadow-sm">
      <div className="text-base font-semibold text-zinc-900">{title}</div>
      {description ? <p className="mt-2 text-sm text-zinc-600">{description}</p> : null}
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 rounded-full border border-[#5E704F] px-4 py-2 text-xs font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
