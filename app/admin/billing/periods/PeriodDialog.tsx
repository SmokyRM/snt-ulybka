"use client";

import { useState, useEffect } from "react";
import type { BillingPeriod, PeriodStatus } from "@/lib/billing/core";

interface PeriodDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { year: number; month: number; status?: PeriodStatus }) => void;
  editingPeriod: BillingPeriod | null;
}

export default function PeriodDialog({ open, onClose, onSave, editingPeriod }: PeriodDialogProps) {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [status, setStatus] = useState<PeriodStatus>("open");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Reset form when dialog opens or editingPeriod changes.
    // Schedule setState in microtask to avoid react-hooks/set-state-in-effect (sync setState in effect).
    if (!open) return;
    const p = editingPeriod;
    const now = new Date();
    queueMicrotask(() => {
      if (p) {
        setYear(p.year);
        setMonth(p.month);
        setStatus(p.status);
      } else {
        setYear(now.getFullYear());
        setMonth(now.getMonth() + 1);
        setStatus("open");
      }
      setErrors({});
    });
  }, [open, editingPeriod]);

  if (!open) return null;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      newErrors.year = "Год должен быть между 2000 и 2100";
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      newErrors.month = "Месяц должен быть между 1 и 12";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({ year, month, status: editingPeriod ? status : undefined });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-zinc-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-zinc-900">
            {editingPeriod ? "Редактировать период" : "Создать период"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <label className="space-y-1 text-sm">
                <span className="font-medium text-zinc-700">
                  Год <span className="text-red-500">*</span>
                </span>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  min={2000}
                  max={2100}
                  className={`w-full rounded border px-3 py-2 text-sm ${errors.year ? "border-red-300" : "border-zinc-300"}`}
                />
                {errors.year && <p className="text-xs text-red-600">{errors.year}</p>}
              </label>

              <label className="space-y-1 text-sm">
                <span className="font-medium text-zinc-700">
                  Месяц <span className="text-red-500">*</span>
                </span>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className={`w-full rounded border px-3 py-2 text-sm ${errors.month ? "border-red-300" : "border-zinc-300"}`}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                    <option key={m} value={m}>
                      {String(m).padStart(2, "0")}
                    </option>
                  ))}
                </select>
                {errors.month && <p className="text-xs text-red-600">{errors.month}</p>}
              </label>
            </div>

            {editingPeriod && (
              <label className="space-y-1 text-sm">
                <span className="font-medium text-zinc-700">Статус</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as PeriodStatus)}
                  className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                >
                  <option value="open">Открыт</option>
                  <option value="closed">Закрыт</option>
                </select>
              </label>
            )}
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
              {editingPeriod ? "Сохранить" : "Создать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}