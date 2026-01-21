"use client";

import { useEffect, useMemo, useState } from "react";
import EmptyStateCard from "@/components/EmptyStateCard";

type CodeRequestStatus = "NEW" | "RESOLVED";

type CodeRequest = {
  id: string;
  userId: string;
  plotDisplay: string;
  cadastralNumber?: string | null;
  comment?: string | null;
  status: CodeRequestStatus;
  adminComment?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  plotId?: string | null;
};

type PlotOption = {
  plotId: string;
  displayName?: string | null;
  street: string;
  plotNumber: string;
};

type Props = {
  requests: CodeRequest[];
  plots: PlotOption[];
  onResolve: (formData: FormData) => Promise<void>;
};

export default function CodeRequestsClient({ requests, plots, onResolve }: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(t);
  }, [query]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return requests.filter((req) => {
      if (status && req.status !== status) return false;
      if (!q) return true;
      const haystack = [req.id, req.userId, req.plotDisplay, req.cadastralNumber ?? "", req.comment ?? ""]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [requests, debouncedQuery, status]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск по участку, кадастру, userId"
          className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="">Все статусы</option>
          <option value="NEW">NEW</option>
          <option value="RESOLVED">RESOLVED</option>
        </select>
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setStatus("");
          }}
          className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400"
        >
          Сбросить фильтры
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyStateCard title="Ничего не найдено" description="Попробуйте изменить фильтры или очистить поиск." />
      ) : (
        <div className="space-y-3">
          {filtered
            .slice()
            .reverse()
            .map((req) => (
              <div key={req.id} className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-800 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-zinc-900">{req.plotDisplay}</div>
                    <div className="text-xs text-zinc-600">Кадастровый: {req.cadastralNumber || "—"}</div>
                    <div className="text-xs text-zinc-600">Комментарий: {req.comment || "—"}</div>
                    <div className="text-xs text-zinc-600">Статус: {req.status}</div>
                    {req.resolvedBy ? <div className="text-xs text-zinc-600">Закрыл: {req.resolvedBy}</div> : null}
                    <div className="text-xs text-zinc-600">
                      Создано: {new Date(req.createdAt).toLocaleString("ru-RU")}
                      {req.resolvedAt ? ` • Закрыто: ${new Date(req.resolvedAt).toLocaleString("ru-RU")}` : ""}
                    </div>
                  </div>
                  {req.status === "NEW" ? (
                    <form
                      action={onResolve}
                      onSubmit={(event) => {
                        if (!window.confirm("Закрыть запрос и сгенерировать код?")) {
                          event.preventDefault();
                          return;
                        }
                        setSubmittingId(req.id);
                      }}
                      className="flex flex-col gap-2 sm:flex-row sm:items-end"
                    >
                      <input type="hidden" name="id" value={req.id} />
                      <label className="text-xs font-semibold text-zinc-700">
                        Участок
                        <select name="plotId" className="mt-1 rounded border border-zinc-300 px-2 py-1 text-sm" defaultValue="">
                          <option value="">Не выбрано</option>
                          {plots.map((p) => (
                            <option key={p.plotId} value={p.plotId}>
                              {p.displayName || `${p.street} ${p.plotNumber}`}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs font-semibold text-zinc-700">
                        Комментарий
                        <input
                          name="adminComment"
                          className="mt-1 w-48 rounded border border-zinc-300 px-2 py-1 text-sm"
                          placeholder="Комментарий"
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={submittingId === req.id}
                        className="rounded-full bg-[#5E704F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4d5d41] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {submittingId === req.id ? "Сохраняем..." : "Сгенерировать код и закрыть"}
                      </button>
                    </form>
                  ) : (
                    <div className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700">
                      Завершено
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
