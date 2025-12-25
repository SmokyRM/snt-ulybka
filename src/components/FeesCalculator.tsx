"use client";

import { useMemo, useState } from "react";
import CopyToClipboard from "@/components/CopyToClipboard";
import { FEES_RATE_RUB_PER_M2, FEES_RATE_RUB_PER_SOTKA } from "@/content/fees";

type Unit = "sotka" | "m2";

const format = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return "—";
  return value.toFixed(2);
};

export default function FeesCalculator() {
  const [area, setArea] = useState("");
  const [unit, setUnit] = useState<Unit>("sotka");
  const [street, setStreet] = useState("");
  const [plot, setPlot] = useState("");
  const [period, setPeriod] = useState(new Date().getFullYear().toString());
  const [fullName, setFullName] = useState("");

  const parsedArea = useMemo(() => {
    if (!area.trim()) return null;
    const normalized = area.replace(",", ".").trim();
    const num = Number.parseFloat(normalized);
    if (!Number.isFinite(num) || num < 0) return null;
    return num;
  }, [area]);

  const rate = unit === "sotka" ? FEES_RATE_RUB_PER_SOTKA : FEES_RATE_RUB_PER_M2;

  const total = useMemo(() => {
    if (parsedArea === null) return null;
    return parsedArea * rate;
  }, [parsedArea, rate]);

  const paymentText = useMemo(() => {
    const streetText = street || "<улица>";
    const plotText = plot || "<участок>";
    const periodText = period || "<период>";
    const nameText = fullName || "<ФИО>";
    return `СНТ «Улыбка», взносы, ул. ${streetText}, уч. ${plotText}, период ${periodText}, ФИО ${nameText}`;
  }, [street, plot, period, fullName]);

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-zinc-900">Калькулятор взноса</h3>
      <p className="mt-2 text-sm text-zinc-600">
        Формула: площадь × ставка = сумма. Ставка будет утверждена решением общего собрания.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-800">Площадь участка</label>
          <input
            type="text"
            inputMode="decimal"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="w-full rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm outline-none transition-shadow focus:border-[#5E704F] focus:ring-2 focus:ring-[#5E704F]/30"
            placeholder="Например, 8.5"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-800">Единицы</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setUnit("sotka")}
              className={`w-full rounded-full border px-4 py-2 text-sm font-semibold ${
                unit === "sotka"
                  ? "border-[#5E704F] bg-[#5E704F]/10 text-[#5E704F]"
                  : "border-zinc-200 text-zinc-700"
              }`}
            >
              Сотки
            </button>
            <button
              type="button"
              onClick={() => setUnit("m2")}
              className={`w-full rounded-full border px-4 py-2 text-sm font-semibold ${
                unit === "m2"
                  ? "border-[#5E704F] bg-[#5E704F]/10 text-[#5E704F]"
                  : "border-zinc-200 text-zinc-700"
              }`}
            >
              м²
            </button>
          </div>
          <p className="text-xs text-zinc-600">
            Текущая ставка (пример): {rate.toFixed(2)} ₽ за {unit === "sotka" ? "сотку" : "м²"}.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-[#5E704F]/5 px-4 py-3 text-sm text-zinc-800">
        Сумма к оплате:{" "}
        <span className="font-semibold text-[#5E704F]">
          {format(total)} ₽
        </span>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-800">Улица</label>
          <input
            type="text"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            className="w-full rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm outline-none transition-shadow focus:border-[#5E704F] focus:ring-2 focus:ring-[#5E704F]/30"
            placeholder="Например, Центральная"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-800">Участок</label>
          <input
            type="text"
            value={plot}
            onChange={(e) => setPlot(e.target.value)}
            className="w-full rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm outline-none transition-shadow focus:border-[#5E704F] focus:ring-2 focus:ring-[#5E704F]/30"
            placeholder="Например, 12"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-800">Период</label>
          <input
            type="text"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-full rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm outline-none transition-shadow focus:border-[#5E704F] focus:ring-2 focus:ring-[#5E704F]/30"
            placeholder="Например, 2025"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-800">ФИО</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm outline-none transition-shadow focus:border-[#5E704F] focus:ring-2 focus:ring-[#5E704F]/30"
            placeholder="ФИО плательщика"
          />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-800">
        {paymentText}
      </div>
      <div className="mt-3">
        <CopyToClipboard text={paymentText} label="Скопировать назначение платежа" />
      </div>
    </div>
  );
}
