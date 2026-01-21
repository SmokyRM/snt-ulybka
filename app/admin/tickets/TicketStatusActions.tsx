"use client";

import { useState } from "react";
import { useAppRouter } from "@/hooks/useAppRouter";
import { Ticket } from "@/types/snt";
import { ApiError, readRaw } from "@/lib/api/client";

const statusOptions: { value: Ticket["status"]; label: string }[] = [
  { value: "NEW", label: "Новый" },
  { value: "IN_PROGRESS", label: "В работе" },
  { value: "DONE", label: "Решено" },
];

export default function TicketStatusActions({ ticketId, current }: { ticketId: string; current: Ticket["status"] }) {
  const router = useAppRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState<Ticket["status"]>(current);

  const updateStatus = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      await readRaw(
        await fetch(`/api/tickets/${ticketId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: value }),
        })
      );
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setError(error.message || "Не удалось обновить статус");
        return;
      }
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        onChange={(e) => setValue(e.target.value as Ticket["status"])}
        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
      >
        {statusOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={updateStatus}
        disabled={loading}
        className="rounded-full bg-[#5E704F] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#4d5d41] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Сохраняю..." : "Сохранить"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
