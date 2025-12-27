"use client";

import { useState } from "react";

type PlotAccessBlockProps = {
  hasPlots: boolean;
  codeRequestSent: boolean;
  onSubmitCode: (formData: FormData) => Promise<void>;
  onRequestCode: (formData: FormData) => Promise<void>;
};

export default function PlotAccessBlock({ hasPlots, codeRequestSent, onSubmitCode, onRequestCode }: PlotAccessBlockProps) {
  const initialMode: "have" | "request" = codeRequestSent ? "request" : hasPlots ? "have" : "request";
  // Keep hooks unconditional; avoid conditional hook branches to prevent hook-order errors.
  const [mode, setMode] = useState<"have" | "request">(initialMode);

  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-800 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-zinc-900">Доступ к участку</div>
        <div className="flex overflow-hidden rounded-full border border-zinc-200 text-xs">
          <button
            type="button"
            onClick={() => setMode("have")}
            className={`px-3 py-1 font-semibold transition ${
              mode === "have" ? "bg-[#5E704F] text-white" : "bg-white text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            У меня есть код
          </button>
          <button
            type="button"
            onClick={() => setMode("request")}
            className={`px-3 py-1 font-semibold transition ${
              mode === "request" ? "bg-[#5E704F] text-white" : "bg-white text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            У меня нет кода
          </button>
        </div>
      </div>

      {mode === "have" ? (
        <form action={onSubmitCode} className="flex flex-col gap-2 sm:flex-row">
          <input
            name="inviteToken"
            placeholder="Код приглашения"
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            required
          />
          <button
            type="submit"
            className="rounded-full bg-[#5E704F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4d5d41]"
          >
            Подтвердить доступ
          </button>
        </form>
      ) : codeRequestSent ? (
        <div className="space-y-2 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          <div>Запрос отправлен. Правление выдаст код доступа.</div>
          <button
            type="button"
            onClick={() => setMode("have")}
            className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-[11px] font-semibold text-emerald-800 hover:border-emerald-400"
          >
            У меня уже есть код
          </button>
        </div>
      ) : (
        <form action={onRequestCode} className="space-y-2">
          <label className="block text-sm text-zinc-800">
            Улица и участок
            <input
              name="plot_display"
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              placeholder="Улица Березовая, участок 12"
              required
            />
          </label>
          <label className="block text-sm text-zinc-800">
            Кадастровый номер (опционально)
            <input
              name="cadastral_number"
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              placeholder="74:00:0000000:1234"
            />
          </label>
          <label className="block text-sm text-zinc-800">
            Комментарий (опционально)
            <textarea
              name="comment"
              rows={2}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              placeholder="Например: когда удобна связь"
            />
          </label>
          <button
            type="submit"
            className="rounded-full bg-[#5E704F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4d5d41]"
          >
            Отправить запрос
          </button>
        </form>
      )}
    </div>
  );
}
