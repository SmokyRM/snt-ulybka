"use client";

type Props = {
  message?: string;
  testId?: string;
};

export default function OfficeLoadingState({
  message = "Загрузка...",
  testId = "office-loading-state",
}: Props) {
  return (
    <div
      className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center"
      data-testid={testId}
    >
      <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-zinc-200 border-t-[#5E704F]" />
      <p className="text-sm text-zinc-600">{message}</p>
    </div>
  );
}
