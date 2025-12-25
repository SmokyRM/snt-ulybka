"use client";

import { useState } from "react";
import { membershipLabel } from "@/lib/membershipLabels";
import { Plot } from "@/types/snt";

export default function ClientTable({ plots }: { plots: Plot[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? plots.map((p) => p.id) : []);
  };
  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => {
      if (checked) return Array.from(new Set([...prev, id]));
      return prev.filter((v) => v !== id);
    });
  };

  const applyBulk = async (patch: { isConfirmed?: boolean; membershipStatus?: Plot["membershipStatus"]; clearContacts?: boolean }) => {
    if (!selected.length) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/plots/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selected, patch }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error || "Не удалось применить");
      } else {
        setMessage(`Готово: обновлено ${data.updated ?? 0}`);
        setSelected([]);
      }
      window.location.reload();
    } catch {
      setMessage("Ошибка сети");
    } finally {
      setBusy(false);
    }
  };

  const statusConfirmed = (plot: Plot) => (plot.isConfirmed ? "Да" : "Нет");
  const contactShort = (plot: Plot) => {
    if (plot.phone) return plot.phone;
    if (plot.email) return plot.email;
    return "—";
  };

  return (
    <div className="space-y-3">
      {selected.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-3 text-sm shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-zinc-800">Выбрано: {selected.length}</span>
            <button
              type="button"
              onClick={() => applyBulk({ isConfirmed: true })}
              disabled={busy}
              className="rounded border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-100 disabled:opacity-60"
            >
              Подтвердить
            </button>
            <button
              type="button"
              onClick={() => applyBulk({ isConfirmed: false })}
              disabled={busy}
              className="rounded border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-100 disabled:opacity-60"
            >
              Снять подтверждение
            </button>
            <button
              type="button"
              onClick={() => applyBulk({ clearContacts: true })}
              disabled={busy}
              className="rounded border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-100 disabled:opacity-60"
            >
              Очистить контакты
            </button>
            <select
              className="rounded border border-zinc-300 px-2 py-1 text-xs"
              onChange={(e) => applyBulk({ membershipStatus: e.target.value as Plot["membershipStatus"] })}
              defaultValue=""
              disabled={busy}
            >
              <option value="">Сменить членство</option>
              <option value="UNKNOWN">Не определён</option>
              <option value="MEMBER">Член</option>
              <option value="NON_MEMBER">Не член</option>
            </select>
            {message && <span className="text-zinc-700">{message}</span>}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-3 py-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-zinc-300 text-[#5E704F]"
                  checked={selected.length === plots.length && plots.length > 0}
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Улица</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Участок</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Членство</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Подтверждён</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Контакты</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {plots.map((plot) => (
              <tr key={plot.id} className="hover:bg-zinc-50">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-zinc-300 text-[#5E704F]"
                    checked={selected.includes(plot.id)}
                    onChange={(e) => toggleOne(plot.id, e.target.checked)}
                  />
                </td>
                <td className="px-3 py-2">{plot.street}</td>
                <td className="px-3 py-2">{plot.plotNumber}</td>
                <td className="px-3 py-2">{membershipLabel(plot.membershipStatus)}</td>
                <td className="px-3 py-2">{statusConfirmed(plot)}</td>
                <td className="px-3 py-2">{contactShort(plot)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
