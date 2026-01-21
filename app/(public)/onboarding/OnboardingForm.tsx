"use client";

import Link from "next/link";
import { useState } from "react";

type Props = {
  action: (formData: FormData) => void;
  error?: string | null;
  fromCabinet?: boolean;
};

export function OnboardingForm({ action, error, fromCabinet }: Props) {
  const [plots, setPlots] = useState<string[]>([""]);
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);

  const addPlot = () => setPlots((prev) => (prev.length >= 3 ? prev : [...prev, ""]));
  const removePlot = (idx: number) => setPlots((prev) => prev.filter((_, i) => i !== idx));
  const updatePlot = (idx: number, value: string) =>
    setPlots((prev) => prev.map((p, i) => (i === idx ? value : p)));

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (consent) {
      setConsentError(false);
      return;
    }
    event.preventDefault();
    setConsentError(true);
  };

  return (
    <form action={action} className="space-y-5" onSubmit={handleSubmit}>
      {fromCabinet ? <input type="hidden" name="fromCabinet" value="1" /> : null}
      <div className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Контактные данные</h3>
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
        <div className="space-y-2 text-sm text-zinc-700">
          <label className="flex items-start gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => {
                setConsent(event.target.checked);
                if (event.target.checked) setConsentError(false);
              }}
              className="mt-0.5"
              required
            />
            <span>Я даю согласие на обработку персональных данных</span>
          </label>
          <p className="text-xs text-zinc-500">
            Данные используются только для работы СНТ «Улыбка».{" "}
            <a href="/help#privacy" className="text-[#5E704F] underline">
              Подробнее
            </a>
          </p>
          {consentError ? (
            <p className="text-xs text-rose-600">Необходимо согласие для продолжения.</p>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={!consent}
          className="w-full rounded-full bg-[#5E704F] px-5 py-2 text-sm font-semibold text-white hover:bg-[#4d5d41] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Перейти в личный кабинет
        </button>
        <Link
          href="/security"
          className="block text-center text-xs text-zinc-500 transition hover:text-[#5E704F] hover:underline"
        >
          🔒 Как мы проверяем доступ и защищаем данные
        </Link>
        <Link
          href="/"
          className="block text-center text-xs text-zinc-500 transition hover:text-[#5E704F] hover:underline"
        >
          ← Вернуться позже
        </Link>
        <p className="text-center text-sm text-zinc-600">
          ℹ️ Все данные можно изменить позже в личном кабинете.
        </p>
      </div>
    </form>
  );
}
