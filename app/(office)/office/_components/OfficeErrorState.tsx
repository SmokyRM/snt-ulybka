"use client";

type Props = {
  message?: string;
  onRetry?: () => void;
  testId?: string;
};

export default function OfficeErrorState({
  message = "Произошла ошибка при загрузке данных.",
  onRetry,
  testId = "office-error-state",
}: Props) {
  return (
    <div
      className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center"
      data-testid={testId}
      role="alert"
    >
      <p className="text-sm text-red-700">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-block rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-50"
          data-testid="office-retry-button"
        >
          Повторить
        </button>
      )}
    </div>
  );
}
