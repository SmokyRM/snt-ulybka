"use client";

import { useEffect, useState } from "react";
import { readOk } from "@/lib/api/client";

type Meter = {
  id: string;
  plotId: string;
  meterNumber?: string | null;
  plot?: {
    street?: string;
    plotNumber?: string;
  } | null;
  lastReading?: {
    value: number;
    readingDate: string;
  } | null;
};

export default function ManualInputForm() {
  const [meters, setMeters] = useState<Meter[]>([]);
  const [selectedMeterId, setSelectedMeterId] = useState("");
  const [value, setValue] = useState("");
  const [readingDate, setReadingDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadMeters();
  }, []);

  const loadMeters = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/electricity/meters?active=true");
      const data = await readOk<{ meters: Meter[] }>(res);
      setMeters(data.meters);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!selectedMeterId) {
      setError("Выберите участок");
      return;
    }

    const numValue = Number(value);
    if (!Number.isFinite(numValue) || numValue < 0) {
      setError("Введите корректное показание");
      return;
    }

    const selectedMeter = meters.find((m) => m.id === selectedMeterId);
    if (selectedMeter?.lastReading && numValue < selectedMeter.lastReading.value) {
      setError(`Показание не может быть меньше предыдущего (${selectedMeter.lastReading.value})`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/electricity/readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meterId: selectedMeterId,
          readingDate: `${readingDate}T00:00:00.000Z`,
          value: numValue,
          source: "manual_admin",
        }),
      });
      await readOk(res);

      setSuccess(true);
      setValue("");
      await loadMeters();
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const selectedMeter = meters.find((m) => m.id === selectedMeterId);
  const consumption = selectedMeter?.lastReading && value
    ? Number(value) - selectedMeter.lastReading.value
    : null;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-zinc-900">Ручной ввод показаний</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Участок <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedMeterId}
              onChange={(e) => setSelectedMeterId(e.target.value)}
              required
              disabled={loading || saving}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm disabled:opacity-50"
            >
              <option value="">Выберите участок</option>
              {meters.map((meter) => (
                <option key={meter.id} value={meter.id}>
                  {meter.plot?.street ? `${meter.plot.street}, ${meter.plot.plotNumber}` : meter.plotId}
                  {meter.meterNumber ? ` (№${meter.meterNumber})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Показание <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
              disabled={saving}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm disabled:opacity-50"
              placeholder="0.00"
            />
            {selectedMeter?.lastReading && (
              <p className="mt-1 text-xs text-zinc-500">
                Предыдущее: {selectedMeter.lastReading.value} ({new Date(selectedMeter.lastReading.readingDate).toLocaleDateString("ru-RU")})
              </p>
            )}
            {consumption !== null && (
              <p className={`mt-1 text-xs font-semibold ${consumption < 0 ? "text-red-600" : "text-green-600"}`}>
                Потребление: {consumption} кВт·ч
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Дата <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={readingDate}
              onChange={(e) => setReadingDate(e.target.value)}
              required
              disabled={saving}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm disabled:opacity-50"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900" role="alert">
            Показание успешно сохранено
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving || loading}
            className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41] disabled:opacity-50"
          >
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </form>
    </div>
  );
}
