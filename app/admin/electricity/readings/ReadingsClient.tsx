"use client";

import { useEffect, useState } from "react";
import { readOk } from "@/lib/api/client";
import { formatAdminTime } from "@/lib/settings.shared";

type Reading = {
  id: string;
  meterId: string;
  readingDate: string;
  value: number;
  source: "manual_admin" | "import" | "owner";
  createdAt: string;
  meter: {
    id: string;
    plotId: string;
    meterNumber?: string | null;
  };
  plot?: {
    street?: string;
    plotNumber?: string;
    ownerFullName?: string | null;
  } | null;
  previousReading?: {
    value: number;
    readingDate: string;
  } | null;
  consumption?: number | null;
  status: "normal" | "anomaly" | "suspicious";
  createdBy?: {
    id: string;
    fullName?: string | null;
    role?: string | null;
  } | null;
};

export default function ReadingsClient() {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    periodFrom: "",
    periodTo: "",
    street: "",
    plotNumber: "",
    anomalies: false,
  });

  const loadReadings = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.periodFrom) params.set("periodFrom", filters.periodFrom);
      if (filters.periodTo) params.set("periodTo", filters.periodTo);
      if (filters.street) params.set("street", filters.street);
      if (filters.plotNumber) params.set("plotNumber", filters.plotNumber);
      if (filters.anomalies) params.set("anomalies", "true");

      const res = await fetch(`/api/admin/electricity/readings/list?${params.toString()}`);
      const data = await readOk<{ readings: Reading[] }>(res);
      setReadings(data.readings);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReadings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStatusBadge = (status: Reading["status"]) => {
    switch (status) {
      case "anomaly":
        return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">Аномалия</span>;
      case "suspicious":
        return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Подозрительно</span>;
      default:
        return <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">Норма</span>;
    }
  };

  const getSourceLabel = (source: Reading["source"]) => {
    switch (source) {
      case "manual_admin":
        return "Ручной ввод";
      case "import":
        return "Импорт";
      case "owner":
        return "Владелец";
      default:
        return source;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Период от</label>
            <input
              type="date"
              value={filters.periodFrom}
              onChange={(e) => setFilters((prev) => ({ ...prev, periodFrom: e.target.value }))}
              className="w-full rounded border border-zinc-300 px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Период до</label>
            <input
              type="date"
              value={filters.periodTo}
              onChange={(e) => setFilters((prev) => ({ ...prev, periodTo: e.target.value }))}
              className="w-full rounded border border-zinc-300 px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Улица</label>
            <input
              type="text"
              value={filters.street}
              onChange={(e) => setFilters((prev) => ({ ...prev, street: e.target.value }))}
              placeholder="Все"
              className="w-full rounded border border-zinc-300 px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Участок</label>
            <input
              type="text"
              value={filters.plotNumber}
              onChange={(e) => setFilters((prev) => ({ ...prev, plotNumber: e.target.value }))}
              placeholder="Все"
              className="w-full rounded border border-zinc-300 px-2 py-1 text-sm"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.anomalies}
                onChange={(e) => setFilters((prev) => ({ ...prev, anomalies: e.target.checked }))}
                className="h-4 w-4 rounded border-zinc-300"
              />
              <span className="text-xs font-medium text-zinc-700">Только аномалии</span>
            </label>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={loadReadings}
            disabled={loading}
            className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41] disabled:opacity-50"
          >
            {loading ? "Загрузка..." : "Применить фильтры"}
          </button>
          <button
            type="button"
            onClick={() => {
              setFilters({ periodFrom: "", periodTo: "", street: "", plotNumber: "", anomalies: false });
              setTimeout(loadReadings, 0);
            }}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            Сбросить
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Участок</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Владелец</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">№ счётчика</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Предыдущее</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Текущее</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Потребление</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Дата</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Внесено</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {readings.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-zinc-500" colSpan={9}>
                  {loading ? "Загрузка..." : "Нет показаний"}
                </td>
              </tr>
            ) : (
              readings.map((reading) => (
                <tr key={reading.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 text-zinc-900">
                    {reading.plot?.street ? `${reading.plot.street}, ${reading.plot.plotNumber}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{reading.plot?.ownerFullName || "—"}</td>
                  <td className="px-4 py-3 text-zinc-700">{reading.meter.meterNumber || "—"}</td>
                  <td className="px-4 py-3 text-zinc-700">
                    {reading.previousReading ? `${reading.previousReading.value} (${new Date(reading.previousReading.readingDate).toLocaleDateString("ru-RU")})` : "—"}
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-900">{reading.value}</td>
                  <td className="px-4 py-3 text-zinc-700">
                    {reading.consumption !== null ? `${reading.consumption} кВт·ч` : "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{new Date(reading.readingDate).toLocaleDateString("ru-RU")}</td>
                  <td className="px-4 py-3 text-zinc-700">
                    <div className="text-xs">
                      <div>{getSourceLabel(reading.source)}</div>
                      {reading.createdBy && (
                        <div className="text-zinc-600">
                          {reading.createdBy.fullName || reading.createdBy.role || reading.createdBy.id}
                        </div>
                      )}
                      <div className="text-zinc-500">{formatAdminTime(reading.createdAt)}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(reading.status)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
