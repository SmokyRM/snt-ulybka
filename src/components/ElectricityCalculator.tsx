"use client";

import { useMemo, useState } from "react";
import { ELECTRICITY_TARIFF_RUB_PER_KWH } from "@/content/electricity";

const formatNumber = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return "—";
  return value.toFixed(2);
};

export default function ElectricityCalculator() {
  const [input, setInput] = useState("");

  const parsedKwh = useMemo(() => {
    if (!input.trim()) return null;
    const normalized = input.replace(",", ".").trim();
    const num = Number.parseFloat(normalized);
    return Number.isFinite(num) ? num : null;
  }, [input]);

  const total = useMemo(() => {
    if (parsedKwh === null) return null;
    return parsedKwh * ELECTRICITY_TARIFF_RUB_PER_KWH;
  }, [parsedKwh]);

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-zinc-900">Калькулятор оплаты</h3>
      <p className="mt-2 text-sm text-zinc-600">
        Тариф: {ELECTRICITY_TARIFF_RUB_PER_KWH.toFixed(2)} ₽ за 1 кВт·ч.
      </p>
      <div className="mt-4 space-y-3">
        <label className="text-sm font-medium text-zinc-800">
          Введите потребление, кВт·ч
        </label>
        <input
          type="text"
          inputMode="decimal"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm outline-none transition-shadow focus:border-[#5E704F] focus:ring-2 focus:ring-[#5E704F]/30"
          placeholder="Например, 120.5"
        />
      </div>
      <div className="mt-4 rounded-2xl bg-[#5E704F]/5 px-4 py-3 text-sm text-zinc-800">
        Итог к оплате:{" "}
        <span className="font-semibold text-[#5E704F]">
          {formatNumber(total)} ₽
        </span>
      </div>
    </div>
  );
}
