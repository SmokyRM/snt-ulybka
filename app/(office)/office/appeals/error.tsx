"use client";

export default function OfficeAppealsError({ reset }: { reset: () => void }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-700">
      <div>Не удалось загрузить обращения.</div>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-3 inline-flex items-center rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700"
      >
        Повторить
      </button>
    </div>
  );
}
