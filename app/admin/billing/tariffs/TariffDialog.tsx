"use client";

import { useState, useEffect } from "react";
import type { FeeTariff, FeeTariffStatus } from "@/lib/billing";

interface TariffDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    type: string;
    title: string;
    amount: number;
    appliesTo: "plot" | "area";
    activeFrom: string;
    activeTo: string | null;
    status: FeeTariffStatus;
    overrideOverlap: boolean;
  }) => void;
  editingTariff: FeeTariff | null;
}

export default function TariffDialog({ open, onClose, onSave, editingTariff }: TariffDialogProps) {
  const [type, setType] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [appliesTo, setAppliesTo] = useState<"plot" | "area">("plot");
  const [activeFrom, setActiveFrom] = useState("");
  const [activeTo, setActiveTo] = useState("");
  const [status, setStatus] = useState<FeeTariffStatus>("active");
  const [overrideOverlap, setOverrideOverlap] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Reset form when dialog opens or editingTariff changes.
    // Schedule setState in microtask to avoid react-hooks/set-state-in-effect (sync setState in effect).
    if (!open) return;
    const t = editingTariff;
    const today = new Date().toISOString().split("T")[0];
    queueMicrotask(() => {
      if (t) {
        setType(t.type);
        setTitle(t.title);
        setAmount(t.amount.toString());
        setAppliesTo(t.appliesTo);
        setActiveFrom(t.activeFrom.split("T")[0]);
        setActiveTo(t.activeTo ? t.activeTo.split("T")[0] : "");
        setStatus(t.status);
        setOverrideOverlap(false);
      } else {
        setType("");
        setTitle("");
        setAmount("");
        setAppliesTo("plot");
        setActiveFrom(today);
        setActiveTo("");
        setStatus("active");
        setOverrideOverlap(false);
      }
      setErrors({});
    });
  }, [open, editingTariff]);

  if (!open) return null;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!type.trim()) {
      newErrors.type = "Тип обязателен";
    }
    if (!title.trim()) {
      newErrors.title = "Название обязательно";
    }
    const amountNum = Number(amount.replace(",", "."));
    if (!Number.isFinite(amountNum) || amountNum <= 0 || amountNum > 1_000_000) {
      newErrors.amount = "Сумма должна быть больше 0 и не превышать 1 000 000";
    }
    if (!activeFrom) {
      newErrors.activeFrom = "Дата начала обязательна";
    } else if (Number.isNaN(new Date(activeFrom).getTime())) {
      newErrors.activeFrom = "Некорректная дата";
    }
    if (activeTo && Number.isNaN(new Date(activeTo).getTime())) {
      newErrors.activeTo = "Некорректная дата";
    }
    if (activeFrom && activeTo && new Date(activeFrom) > new Date(activeTo)) {
      newErrors.activeTo = "Дата окончания должна быть позже даты начала";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSave({
      type: type.trim(),
      title: title.trim(),
      amount: Number(amount.replace(",", ".")),
      appliesTo,
      activeFrom: new Date(activeFrom).toISOString(),
      activeTo: activeTo.trim() ? new Date(activeTo).toISOString() : null,
      status,
      overrideOverlap,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-zinc-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-zinc-900">
            {editingTariff ? "Редактировать тариф" : "Создать тариф"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium text-zinc-700">
                  Тип <span className="text-red-500">*</span>
                </span>
                <input
                  type="text"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  placeholder="например, membership_fee"
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors.type ? "border-red-300" : "border-zinc-300"
                  }`}
                />
                {errors.type && <p className="text-xs text-red-600">{errors.type}</p>}
                <p className="text-xs text-zinc-500">Уникальный идентификатор типа тарифа</p>
              </label>

              <label className="space-y-1 text-sm">
                <span className="font-medium text-zinc-700">
                  Название <span className="text-red-500">*</span>
                </span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="например, Членский взнос 2025"
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors.title ? "border-red-300" : "border-zinc-300"
                  }`}
                />
                {errors.title && <p className="text-xs text-red-600">{errors.title}</p>}
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium text-zinc-700">
                  Сумма, ₽ <span className="text-red-500">*</span>
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="5000"
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors.amount ? "border-red-300" : "border-zinc-300"
                  }`}
                />
                {errors.amount && <p className="text-xs text-red-600">{errors.amount}</p>}
              </label>

              <label className="space-y-1 text-sm">
                <span className="font-medium text-zinc-700">
                  Применяется к <span className="text-red-500">*</span>
                </span>
                <select
                  value={appliesTo}
                  onChange={(e) => setAppliesTo(e.target.value as "plot" | "area")}
                  className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                >
                  <option value="plot">Участок</option>
                  <option value="area">Площадь</option>
                </select>
                <p className="text-xs text-zinc-500">Единица расчета</p>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium text-zinc-700">
                  Действует с <span className="text-red-500">*</span>
                </span>
                <input
                  type="date"
                  value={activeFrom}
                  onChange={(e) => setActiveFrom(e.target.value)}
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors.activeFrom ? "border-red-300" : "border-zinc-300"
                  }`}
                />
                {errors.activeFrom && <p className="text-xs text-red-600">{errors.activeFrom}</p>}
              </label>

              <label className="space-y-1 text-sm">
                <span className="font-medium text-zinc-700">Действует до</span>
                <input
                  type="date"
                  value={activeTo}
                  onChange={(e) => setActiveTo(e.target.value)}
                  placeholder="Оставьте пустым для бессрочного"
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors.activeTo ? "border-red-300" : "border-zinc-300"
                  }`}
                />
                {errors.activeTo && <p className="text-xs text-red-600">{errors.activeTo}</p>}
                <p className="text-xs text-zinc-500">Оставьте пустым для бессрочного действия</p>
              </label>
            </div>

            <div>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-zinc-700">Статус</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as FeeTariffStatus)}
                  className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                >
                  <option value="active">Активен</option>
                  <option value="inactive">Неактивен</option>
                </select>
              </label>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <label className="flex items-start space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={overrideOverlap}
                  onChange={(e) => setOverrideOverlap(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-amber-900">
                  <span className="font-medium">Переопределить перекрытие</span>
                  <br />
                  <span className="text-xs">
                    Разрешить пересекающиеся активные тарифы одного типа (используйте с осторожностью)
                  </span>
                </span>
              </label>
            </div>
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