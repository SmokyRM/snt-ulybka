"use client";

import { useMemo, useState } from "react";
import { FEES_RATE_RUB_PER_SOTKA } from "@/content/fees";

const format = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return "—";
  return value.toFixed(2);
};

export default function FeesCalculator() {
  const [input, setInput] = useState("");

  const parsed = useMemo(() => {
    if (!input.trim()) return null;
    const normalized = input.replace(",", ".").trim();
    const num = Number.parseFloat(normalized);
    if (!Number.isFinite(num) || num < 0) return null;
    return num;
  }, [input]);

  const total = useMemo(() => {
    if (parsed === null) return null;
    return parsed * FEES_RATE_RUB_PER_SOTKA;
  }, [parsed]);

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-zinc-900">Калькулятор взноса</h3>
      <p className="mt-2 text-sm text-zinc-600">
        Формула: площадь (сотки) × ставка = сумма. Текущая ставка:{" "}
        {FEES_RATE_RUB_PER_SOTKA.toFixed(2)} ₽ за сотку (заглушка для обновления).
      </p>
      <div className="mt-4 space-y-3">
        <label className="text-sm font-medium text-zinc-800">
          Площадь участка, сотки
        </label>
        <input
          type="text"
          inputMode="decimal"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm outline-none transition-shadow focus:border-[#5E704F] focus:ring-2 focus:ring-[#5E704F]/30"
          placeholder="Например, 8.5"
        />
      </div>
      <div className="mt-4 rounded-2xl bg-[#5E704F]/5 px-4 py-3 text-sm text-zinc-800">
        Сумма к оплате:{" "}
        <span className="font-semibold text-[#5E704F]">
          {format(total)} ₽
        </span>
      </div>
    </div>
  );
}
