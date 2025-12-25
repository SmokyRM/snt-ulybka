import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import { getSessionUser, isAdmin } from "@/lib/session.server";

type MeterRow = {
  id: string;
  plotId: string;
  street?: string;
  plotNumber?: string;
  meterNumber?: string | null;
  lastReading?: { value: number; readingDate: string } | null;
};

type MeterResponse = {
  meters: Array<MeterRow>;
};

type SaveResult = {
  reading: { id: string; meterId: string; readingDate: string; value: number; source: string; createdAt: string };
  previousValue: number | null;
  currentValue: number;
  deltaKwh: number;
};

export default async function AdminMeterReadingsPage() {
  const user = await getSessionUser();
  if (!isAdmin(user)) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Показания электроэнергии</h1>
          <a
            href="/admin"
            className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
          >
            Назад
          </a>
        </div>
        <ClientTable />
      </div>
    </main>
  );
}

function ClientTable() {
  "use client";
  const [rows, setRows] = useState<MeterRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, SaveResult>>({});
  const [inputs, setInputs] = useState<Record<string, string>>({});

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/electricity/meters?active=true", { cache: "no-store" });
      if (!res.ok) {
        setError("Не удалось загрузить счётчики");
        return;
      }
      const json = (await res.json()) as MeterResponse;
      setRows(json.meters);
      setSaved({});
      setInputs({});
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const saveReading = async (meter: MeterRow) => {
    const valStr = inputs[meter.id];
    const value = Number(valStr);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Введите корректное показание");
      return;
    }
    setSaving((prev) => ({ ...prev, [meter.id]: true }));
    setError(null);
    try {
      const res = await fetch("/api/admin/electricity/readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meterId: meter.id,
          readingDate: new Date().toISOString(),
          value,
          source: "manual_admin",
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        setError(txt || "Ошибка сохранения");
        return;
      }
      const json = (await res.json()) as SaveResult;
      setSaved((prev) => ({ ...prev, [meter.id]: json }));
      setRows((prev) =>
        prev.map((r) => (r.id === meter.id ? { ...r, lastReading: { value, readingDate: json.reading.readingDate } } : r))
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving((prev) => ({ ...prev, [meter.id]: false }));
    }
  };

  const deltaForInput = (meter: MeterRow) => {
    const valStr = inputs[meter.id];
    const value = Number(valStr);
    if (!Number.isFinite(value)) return null;
    const prev = meter.lastReading?.value ?? 0;
    return value - prev;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-sm">
        <button
          type="button"
          onClick={fetchData}
          className="rounded border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100"
          disabled={loading}
        >
          {loading ? "Обновляем..." : "Обновить"}
        </button>
        {error && <span className="text-red-700">{error}</span>}
      </div>

      <div className="overflow-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200 text-xs sm:text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Улица</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Участок</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">№ счётчика</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Предыдущее</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Дата</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Текущее</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Δ кВт</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Действие</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((m) => {
              const savedRow = saved[m.id];
              const disabled = Boolean(savedRow) || saving[m.id];
              const delta = deltaForInput(m);
              return (
                <tr key={m.id} className="align-middle">
                  <td className="px-3 py-2 text-zinc-800">{m.street ?? "—"}</td>
                  <td className="px-3 py-2 text-zinc-800">{m.plotNumber ?? "—"}</td>
                  <td className="px-3 py-2 text-zinc-800">{m.meterNumber ?? "—"}</td>
                  <td className="px-3 py-2 text-zinc-800">
                    {m.lastReading ? `${m.lastReading.value} (${m.lastReading.readingDate})` : "—"}
                  </td>
                  <td className="px-3 py-2 text-zinc-800">{new Date().toISOString().split("T")[0]}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      disabled={disabled}
                      value={inputs[m.id] ?? ""}
                      onChange={(e) =>
                        setInputs((prev) => ({
                          ...prev,
                          [m.id]: e.target.value,
                        }))
                      }
                      className="w-28 rounded border border-zinc-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2 text-zinc-800">{delta !== null ? delta : "—"}</td>
                  <td className="px-3 py-2">
                    {savedRow ? (
                      <span className="text-green-700 font-semibold">Сохранено, Δ={savedRow.deltaKwh}</span>
                    ) : (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => saveReading(m)}
                        className="rounded bg-[#5E704F] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#4f5f42] disabled:cursor-not-allowed disabled:bg-zinc-400"
                      >
                        {saving[m.id] ? "Сохраняем..." : "Сохранить"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-center text-zinc-600" colSpan={8}>
                  Нет активных счётчиков
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

