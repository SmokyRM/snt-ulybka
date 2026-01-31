"use client";

type Props = {
  message?: string;
  showResetButton?: boolean;
  resetHref?: string;
  testId?: string;
};

export default function OfficeEmptyState({
  message = "Данных по выбранным фильтрам нет.",
  showResetButton = false,
  resetHref,
  testId = "office-empty-state",
}: Props) {
  return (
    <div
      className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center"
      data-testid={testId}
    >
      <p className="text-sm text-zinc-600">{message}</p>
      {showResetButton && resetHref && (
        <a
          href={resetHref}
          className="mt-3 inline-block rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-[#5E704F] hover:text-[#5E704F]"
          data-testid="office-reset-filters"
        >
          Сбросить фильтры
        </a>
      )}
    </div>
  );
}
