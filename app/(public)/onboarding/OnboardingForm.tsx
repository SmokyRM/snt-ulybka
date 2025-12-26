"use client";

import { useState } from "react";

type Props = {
  action: (formData: FormData) => void;
  error?: string | null;
};

export function OnboardingForm({ action, error }: Props) {
  const [plots, setPlots] = useState<string[]>([""]);

  const addPlot = () => setPlots((prev) => (prev.length >= 3 ? prev : [...prev, ""]));
  const removePlot = (idx: number) => setPlots((prev) => prev.filter((_, i) => i !== idx));
  const updatePlot = (idx: number, value: string) =>
    setPlots((prev) => prev.map((p, i) => (i === idx ? value : p)));

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Контактные данные</h3>
          <p className="text-xs text-zinc-600">
            Эти данные нужны, чтобы корректно показывать информацию по вашему участку. Используются только для связи по вопросам СНТ.
          </p>
        </div>
        <label className="block text-sm font-semibold text-zinc-800">
          ФИО
          <input
            name="fullName"
            required
            autoFocus
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Иванов Иван Иванович"
          />
        </label>
        <label className="block text-sm font-semibold text-zinc-800">
          Телефон
          <input
            name="phone"
            required
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            placeholder="+7 900 000-00-00"
          />
        </label>
      </div>

      <div className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-zinc-900">Участки (необязательно)</div>
        <div className="space-y-2">
          {plots.map((value, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                name="cadastralNumbers"
                value={value}
                onChange={(e) => updatePlot(idx, e.target.value)}
                placeholder="Кадастровый номер"
                className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              />
              {idx > 0 && (
                <button
                  type="button"
                  onClick={() => removePlot(idx)}
                  className="rounded-full border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-700 hover:border-zinc-400"
                >
                  Удалить
                </button>
              )}
            </div>
          ))}
        </div>
        {plots.length < 3 && (
          <button
            type="button"
            onClick={addPlot}
            className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-zinc-400"
          >
            + Добавить участок
          </button>
        )}
      </div>

      <div className="space-y-2">
        {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">{error}</div> : null}
        <label className="block text-sm font-semibold text-zinc-800">
          Код участка
          <input
            name="plotCode"
            required
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Введите код участка"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-full bg-[#5E704F] px-5 py-2 text-sm font-semibold text-white hover:bg-[#4d5d41]"
        >
          Перейти в личный кабинет
        </button>
        <p className="text-center text-xs text-zinc-600">Вы сможете изменить данные позже.</p>
      </div>
    </form>
  );
}
