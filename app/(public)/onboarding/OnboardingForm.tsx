"use client";

import { useState } from "react";

type Props = {
  action: (formData: FormData) => void;
};

export function OnboardingForm({ action }: Props) {
  const [plots, setPlots] = useState<string[]>([""]);

  const addPlot = () => setPlots((prev) => (prev.length >= 3 ? prev : [...prev, ""]));
  const removePlot = (idx: number) => setPlots((prev) => prev.filter((_, i) => i !== idx));
  const updatePlot = (idx: number, value: string) =>
    setPlots((prev) => prev.map((p, i) => (i === idx ? value : p)));

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
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
            placeholder="+7..."
          />
        </label>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-semibold text-zinc-800">Кадастровые номера (опционально)</div>
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

      <button
        type="submit"
        className="w-full rounded-full bg-[#5E704F] px-5 py-2 text-sm font-semibold text-white hover:bg-[#4d5d41]"
      >
        Сохранить и продолжить
      </button>
    </form>
  );
}
