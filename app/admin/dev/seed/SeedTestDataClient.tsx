"use client";

import { useActionState, useTransition } from "react";
import { seedTestDataAction, SeedActionState } from "./actions";

const initialState: SeedActionState | null = null;

export default function SeedTestDataClient() {
  const [state, action] = useActionState(seedTestDataAction, initialState);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(() => {
      action();
    });
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="text-sm text-zinc-600">
        Создаёт или обновляет тестовые данные и не влияет на реальные записи.
      </div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="mt-4 inline-flex items-center rounded-xl bg-[#5E704F] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {isPending ? "Заполняем…" : "Заполнить тестовыми данными"}
      </button>
      {state?.ok && (
        <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <div className="font-medium">Готово</div>
          <div className="mt-1">
            Период {state.summary.periodKey}, начислено {state.summary.totalAccrued.toLocaleString("ru-RU")} ₽,
            оплачено {state.summary.totalPaid.toLocaleString("ru-RU")} ₽, долг{" "}
            {state.summary.totalDebt.toLocaleString("ru-RU")} ₽.
          </div>
        </div>
      )}
      {state && !state.ok && (
        <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {state.error === "forbidden"
            ? "Недостаточно прав."
            : state.error === "not_available_in_production"
              ? "Недоступно в production."
              : `Ошибка: ${state.error}`}
        </div>
      )}
    </div>
  );
}
