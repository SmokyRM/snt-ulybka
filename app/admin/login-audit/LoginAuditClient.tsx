"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api/client";
import OfficeLoadingState from "../../(office)/office/_components/OfficeLoadingState";
import OfficeErrorState from "../../(office)/office/_components/OfficeErrorState";

type LoginAuditRow = {
  id: string;
  userId: string | null;
  role: string | null;
  success: boolean;
  method: "password" | "code";
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
  createdAt: string;
};

type LoginAuditResponse = {
  items: LoginAuditRow[];
  total: number;
  page: number;
  limit: number;
};

export default function LoginAuditClient() {
  const [items, setItems] = useState<LoginAuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [role, setRole] = useState("");
  const [success, setSuccess] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAudit = async (nextPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (role) params.set("role", role);
      if (success) params.set("success", success);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      params.set("page", String(nextPage));
      params.set("limit", String(limit));
      const data = await apiGet<LoginAuditResponse>(`/api/admin/login-audit?${params.toString()}`);
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
      setPage(data.page ?? nextPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки аудита");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudit(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadAudit(1);
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, success, from, to]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col text-sm">
            Роль
            <input
              className="mt-1 rounded border border-zinc-300 px-2 py-1 text-sm"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              placeholder="admin"
            />
          </label>
          <label className="flex flex-col text-sm">
            Успех
            <select
              className="mt-1 rounded border border-zinc-300 px-2 py-1 text-sm"
              value={success}
              onChange={(event) => setSuccess(event.target.value)}
            >
              <option value="">Все</option>
              <option value="1">Успех</option>
              <option value="0">Ошибка</option>
            </select>
          </label>
          <label className="flex flex-col text-sm">
            C
            <input
              className="mt-1 rounded border border-zinc-300 px-2 py-1 text-sm"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <label className="flex flex-col text-sm">
            По
            <input
              className="mt-1 rounded border border-zinc-300 px-2 py-1 text-sm"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>
          <span className="text-xs text-zinc-500">Всего: {total}</span>
        </div>
      </div>

      {loading ? <OfficeLoadingState message="Загрузка журнала..." /> : null}
      {error ? <OfficeErrorState message={error} onRetry={() => loadAudit(page)} /> : null}

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600">
              <tr>
                <th className="px-3 py-2 text-left">Дата</th>
                <th className="px-3 py-2 text-left">Роль</th>
                <th className="px-3 py-2 text-left">User ID</th>
                <th className="px-3 py-2 text-left">Метод</th>
                <th className="px-3 py-2 text-left">Статус</th>
                <th className="px-3 py-2 text-left">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {items.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-3 py-2 text-zinc-700">{new Date(entry.createdAt).toLocaleString("ru-RU")}</td>
                  <td className="px-3 py-2 text-zinc-700">{entry.role ?? "—"}</td>
                  <td className="px-3 py-2 text-zinc-700">{entry.userId ?? "—"}</td>
                  <td className="px-3 py-2 text-zinc-700">{entry.method}</td>
                  <td className="px-3 py-2 text-zinc-700">{entry.success ? "OK" : "FAIL"}</td>
                  <td className="px-3 py-2 text-zinc-700">{entry.ip ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 ? (
          <div className="mt-3 flex items-center justify-between text-xs text-zinc-600">
            <span>Страница {page} из {totalPages}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded border border-zinc-200 px-2 py-1 disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Назад
              </button>
              <button
                type="button"
                className="rounded border border-zinc-200 px-2 py-1 disabled:opacity-50"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Вперед
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
