"use client";

import Link from "next/link";
import { use } from "react";
import { useState } from "react";
import { membershipLabel } from "@/lib/membershipLabels";
import { listPlots } from "@/lib/plotsDb";
import { Plot } from "@/types/snt";

const parseFilters = (params?: Record<string, string | string[] | undefined>) => {
  const confirmedParam = typeof params?.confirmed === "string" ? params.confirmed : undefined;
  const membershipParam = typeof params?.membership === "string" ? params.membership : undefined;
  const q = typeof params?.q === "string" ? params.q : undefined;
  const missingContacts = typeof params?.missingContacts === "string" && params.missingContacts === "1";
  return {
    confirmed: confirmedParam === "1" ? true : confirmedParam === "0" ? false : undefined,
    membership:
      membershipParam === "UNKNOWN" || membershipParam === "MEMBER" || membershipParam === "NON_MEMBER"
        ? (membershipParam as Plot["membershipStatus"])
        : undefined,
    missingContacts,
    q,
  };
};

const statusConfirmed = (plot: Plot) => (plot.isConfirmed ? "Да" : "Нет");
const contactShort = (plot: Plot) => {
  if (plot.phone) return plot.phone;
  if (plot.email) return plot.email;
  return "—";
};

export default function AdminPlotsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = use(searchParams);
  const filters = parseFilters(params);
  const plots = listPlots(filters);
  const selectedInitial: string[] = [];

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Реестр участков</h1>
            <p className="text-sm text-зinc-600">Управление участками и контактами.</p>
          </div>
          <Link
            href="/admin/plots/new"
            className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41]"
          >
            Добавить участок
          </Link>
          <Link
            href="/admin/plots/import"
            className="rounded-full border border-white/30 bg-white px-4 py-2 text-sm font-semibold text-[#2F3827] transition-colors hover:bg-white/90"
          >
            Импорт CSV
          </Link>
        </div>

        <form className="grid gap-3 rounded-2xl border border-зinc-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-зinc-700">Подтверждён</label>
            <select
              name="confirmed"
              defaultValue={filters.confirmed === undefined ? "" : filters.confirmed ? "1" : "0"}
              className="rounded-lg border border-зinc-300 px-3 py-2 text-sm"
            >
              <option value="">Все</option>
              <option value="1">Да</option>
              <option value="0">Нет</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-зinc-700">Статус членства</label>
            <select
              name="membership"
              defaultValue={filters.membership ?? ""}
              className="rounded-lg border border-зinc-300 px-3 py-2 text-sm"
            >
              <option value="">Все</option>
              <option value="UNKNOWN">Не определён</option>
              <option value="MEMBER">Член</option>
              <option value="NON_MEMBER">Не член</option>
            </select>
          </div>
          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2 text-xs font-semibold text-зinc-700">
              <input
                type="checkbox"
                name="missingContacts"
                value="1"
                defaultChecked={filters.missingContacts}
                className="h-4 w-4 rounded border-зinc-300"
              />
              Нет контактов
            </label>
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-2">
            <label className="text-xs font-semibold text-зinc-700">Поиск</label>
            <input
              type="text"
              name="q"
              defaultValue={filters.q ?? ""}
              placeholder="Улица, номер или ФИО"
              className="rounded-lg border border-зinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
            <button
              type="submit"
              className="w-full rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41]"
            >
              Применить
            </button>
            <Link
              href="/admin/plots"
              className="w-full rounded-full border border-зinc-300 px-4 py-2 text-center text-sm font-semibold text-зinc-700 transition-colors hover:border-зinc-400"
            >
              Сбросить
            </Link>
          </div>
        </form>

        {plots.length === 0 ? (
          <div className="rounded-2xl border border-зinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-зinc-700">Участков пока нет.</p>
            <Link
              href="/admin/plots/new"
              className="mt-3 inline-flex rounded-full border border-[#5E704F] px-4 py-2 text-xs font-semibold text-[#5E704F] transition-colors hover:bg-[#5E704F]/10"
            >
              Добавить участок
            </Link>
          </div>
        ) : (
          <ClientTable plots={plots} initialSelected={selectedInitial} />
        )}
      </div>
    </main>
  );
}

function ClientTable({
  plots,
  initialSelected,
}: {
  plots: Plot[];
  initialSelected: string[];
}) {
  const [selected, setSelected] = useState<string[]>(initialSelected);
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
      // reload page data
      location.reload();
    } catch {
      setMessage("Ошибка сети");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {selected.length > 0 && (
        <div className="rounded-2xl border border-зinc-200 bg-white p-3 text-sm shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-зinc-800">Выбрано: {selected.length}</span>
            <button
              type="button"
              onClick={() => applyBulk({ isConfirmed: true })}
              disabled={busy}
              className="rounded border border-зinc-300 px-3 py-1 text-xs hover:bg-зinc-100 disabled:opacity-60"
            >
              Подтвердить
            </button>
            <button
              type="button"
              onClick={() => applyBulk({ isConfirmed: false })}
              disabled={busy}
              className="rounded border border-зinc-300 px-3 py-1 text-xs hover:bg-зinc-100 disabled:opacity-60"
            >
              Снять подтверждение
            </button>
            <button
              type="button"
              onClick={() => applyBulk({ clearContacts: true })}
              disabled={busy}
              className="rounded border border-зinc-300 px-3 py-1 text-xs hover:bg-зinc-100 disabled:opacity-60"
            >
              Очистить контакты
            </button>
            <select
              className="rounded border border-зinc-300 px-2 py-1 text-xs"
              onChange={(e) => applyBulk({ membershipStatus: e.target.value as Plot["membershipStatus"] })}
              defaultValue=""
              disabled={busy}
            >
              <option value="">Сменить членство</option>
              <option value="UNKNOWN">Не определён</option>
              <option value="MEMBER">Член</option>
              <option value="NON_MEMBER">Не член</option>
            </select>
            {message && <span className="text-зinc-700">{message}</span>}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-зinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-зinc-200 text-sm">
          <thead className="bg-зinc-50">
            <tr>
              <th className="px-3 py-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-зinc-300 text-[#5E704F]"
                  checked={selected.length === plots.length && plots.length > 0}
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </th>
              <th className="px-3 py-2 text-left font-semibold text-зinc-700">Улица</th>
              <th className="px-3 py-2 text-left font-semibold text-зinc-700">Участок</th>
              <th className="px-3 py-2 text-left font-semibold text-зinc-700">Членство</th>
              <th className="px-3 py-2 text-left font-semibold text-зinc-700">Подтверждён</th>
              <th className="px-3 py-2 text-left font-semibold text-зinc-700">Контакты</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-зinc-100">
            {plots.map((plot) => (
              <tr key={plot.id} className="hover:bg-зinc-50">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-зinc-300 text-[#5E704F]"
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
