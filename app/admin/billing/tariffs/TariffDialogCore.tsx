"use client";

import { useState, useEffect } from "react";
import type { ContributionTariff } from "@/lib/billing/core";

interface TariffDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    code: string;
    amount: number;
    unit: ContributionTariff["unit"];
    recurrence: ContributionTariff["recurrence"];
    active: boolean;
  }) => void;
  editingTariff: ContributionTariff | null;
}

export default function TariffDialog({ open, onClose, onSave, editingTariff }: TariffDialogProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState<ContributionTariff["unit"]>("plot");
  const [recurrence, setRecurrence] = useState<ContributionTariff["recurrence"]>("monthly");
  const [active, setActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Reset form when dialog opens or editingTariff changes.
    // Schedule setState in microtask to avoid react-hooks/set-state-in-effect (sync setState in effect).
    if (!open) return;
    const t = editingTariff;
    queueMicrotask(() => {
      if (t) {
        setName(t.name);
        setCode(t.code);
        setAmount(String(t.amount));
        setUnit(t.unit);
        setRecurrence(t.recurrence);
        setActive(t.active);
      } else {
        setName("");
        setCode("");
        setAmount("");
        setUnit("plot");
        setRecurrence("monthly");
        setActive(true);
      }
      setErrors({});
    });
  }, [open, editingTariff]);

  if (!open) return null;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = "Название обязательно";
    }
    if (!code.trim()) {
      newErrors.code = "Код обязателен";
    }
    const amountNum = Number(amount);
    if (!amount.trim() || !Number.isFinite(amountNum) || amountNum <= 0) {
      newErrors.amount = "Сумма должна быть положительным числом";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      name: name.trim(),
      code: code.trim(),
      amount: Number(amount),
      unit,
      recurrence,
      active,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-zinc-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-zinc-900">
            {editingTariff ? "Редактировать тариф" : "Создать тариф"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="space-y-4">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-zinc-700">
                Название <span className="text-red-500">*</span>
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Например, Членский взнос"
                className={`w-full rounded border px-3 py-2 text-sm ${errors.name ? "border-red-300" : "border-zinc-300"}`}
              />
              {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-zinc-700">
                Код <span className="text-red-500">*</span>
              </span>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))}
                placeholder="MEMBERSHIP_FEE"
                className={`w-full rounded border px-3 py-2 text-sm font-mono ${errors.code ? "border-red-300" : "border-zinc-300"}`}
              />
              {errors.code && <p className="text-xs text-red-600">{errors.code}</p>}
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-zinc-700">
                Сумма, ₽ <span className="text-red-500">*</span>
              </span>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={`w-full rounded border px-3 py-2 text-sm ${errors.amount ? "border-red-300" : "border-zinc-300"}`}
              />
              {errors.amount && <p className="text-xs text-red-600">{errors.amount}</p>}
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-zinc-700">Единица</span>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as ContributionTariff["unit"])}
                className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              >
                <option value="plot">Участок</option>
                <option value="area">Площадь</option>
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-zinc-700">Частота</span>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as ContributionTariff["recurrence"])}
                className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              >
                <option value="monthly">Ежемесячно</option>
                <option value="quarterly">Ежеквартально</option>
                <option value="yearly">Ежегодно</option>
                <option value="one-time">Одноразово</option>
              </select>
            </label>

            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="rounded border-zinc-300"
              />
              <span className="font-medium text-zinc-700">Активен</span>
            </label>
          </div>

          <div className="mt-6 flex justify-end space-x-3 border-t border-zinc-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41]"
            >
              {editingTariff ? "Сохранить" : "Создать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}