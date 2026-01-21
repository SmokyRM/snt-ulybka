"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { UnifiedBillingPeriod, BillingPeriodStatus } from "@/types/snt";
import { readOk } from "@/lib/api/client";

interface PeriodsUnifiedClientProps {
  initialPeriods: UnifiedBillingPeriod[];
}

export default function PeriodsUnifiedClient({ initialPeriods }: PeriodsUnifiedClientProps) {
  const router = useRouter();
  const [periods, setPeriods] = useState<UnifiedBillingPeriod[]>(initialPeriods);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<UnifiedBillingPeriod | null>(null);

  const loadPeriods = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/billing/periods", { cache: "no-store" });
      const { periods } = await readOk<{ periods: UnifiedBillingPeriod[] }>(res);
      setPeriods(periods);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingPeriod(null);
    setDialogOpen(true);
  };

  const handleEdit = (period: UnifiedBillingPeriod) => {
    setEditingPeriod(period);
    setDialogOpen(true);
  };

  const handleSave = async (data: {
    from: string;
    to: string;
    status?: BillingPeriodStatus;
    title?: string | null;
  }) => {
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const url = "/api/admin/billing/periods";
      const method = editingPeriod ? "PUT" : "POST";
      const body = editingPeriod ? { id: editingPeriod.id, ...data } : data;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      await readOk<{ period: UnifiedBillingPeriod }>(res);

      setMessage(editingPeriod ? "Период обновлён" : "Период создан");
      setDialogOpen(false);
      setEditingPeriod(null);
      await loadPeriods();

      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ru-RU");
  };

  const statusLabel = (status: BillingPeriodStatus) => {
    switch (status) {
      case "draft":
        return "Черновик";
      case "approved":
        return "Утверждён";
      case "closed":
        return "Закрыт";
      case "locked":
        return "Зафиксирован";
      default:
        return status;
    }
  };

  const statusColor = (status: BillingPeriodStatus) => {
    switch (status) {
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "closed":
        return "bg-zinc-100 text-zinc-600";
      case "locked":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-zinc-100 text-zinc-600";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900">Периоды начислений</h2>
        <button
          type="button"
          onClick={handleCreate}
          className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41]"
        >
          + Создать период
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900" role="alert">
          {message}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Период</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Название</th>
              <th className="px-4 py-3 text-center font-semibold text-zinc-700">Статус</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {(periods || []).map((period) => (
              <tr key={period.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3 font-medium text-zinc-900">
                  {formatDate(period.from)} — {formatDate(period.to)}
                </td>
                <td className="px-4 py-3 text-zinc-700">{period.title || "—"}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex rounded px-2 py-1 text-xs font-medium ${statusColor(period.status)}`}>
                    {statusLabel(period.status)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <a
                      href={`/admin/billing/periods-unified/${period.id}`}
                      className="text-[#5E704F] hover:underline text-sm"
                    >
                      Детали
                    </a>
                    {period.status === "draft" && (
                      <button
                        type="button"
                        onClick={() => handleEdit(period)}
                        className="text-[#5E704F] hover:underline text-sm"
                      >
                        Редактировать
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {periods.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                  Нет периодов. Создайте первый период.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {dialogOpen && (
        <PeriodDialog
          open={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setEditingPeriod(null);
          }}
          onSave={handleSave}
          editingPeriod={editingPeriod}
        />
      )}
    </div>
  );
}

function PeriodDialog({
  open,
  onClose,
  onSave,
  editingPeriod,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: { from: string; to: string; status?: BillingPeriodStatus; title?: string | null }) => void;
  editingPeriod: UnifiedBillingPeriod | null;
}) {
  const [from, setFrom] = useState(editingPeriod?.from || "");
  const [to, setTo] = useState(editingPeriod?.to || "");
  const [status, setStatus] = useState<BillingPeriodStatus>(editingPeriod?.status || "draft");
  const [title, setTitle] = useState(editingPeriod?.title || "");

  useEffect(() => {
    // Reset form when dialog opens or editingPeriod changes.
    // Schedule setState in microtask to avoid react-hooks/set-state-in-effect (sync setState in effect).
    const p = editingPeriod;
    queueMicrotask(() => {
      if (p) {
        setFrom(p.from || "");
        setTo(p.to || "");
        setStatus(p.status || "draft");
        setTitle(p.title || "");
      } else {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setFrom(firstDay.toISOString().split("T")[0]);
        setTo(lastDay.toISOString().split("T")[0]);
        setStatus("draft");
        setTitle("");
      }
    });
  }, [editingPeriod, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-zinc-900 mb-4">
          {editingPeriod ? "Редактировать период" : "Создать период"}
        </h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave({ from, to, status, title: title || null });
          }}
          className="space-y-4"
        >
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-zinc-800">От (дата)</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded border border-zinc-300 px-3 py-2"
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-zinc-800">До (дата)</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded border border-zinc-300 px-3 py-2"
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-zinc-800">Название</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded border border-zinc-300 px-3 py-2"
              placeholder="Например: Январь 2025"
            />
          </label>
          {editingPeriod && (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-zinc-800">Статус</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as BillingPeriodStatus)}
                className="rounded border border-zinc-300 px-3 py-2"
              >
                <option value="draft">Черновик</option>
                <option value="approved">Утверждён</option>
                <option value="closed">Закрыт</option>
              </select>
            </label>
          )}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="rounded bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4d5d41]"
            >
              {editingPeriod ? "Сохранить" : "Создать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
