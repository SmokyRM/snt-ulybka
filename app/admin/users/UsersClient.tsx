"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api/client";
import OfficeLoadingState from "../../(office)/office/_components/OfficeLoadingState";
import OfficeErrorState from "../../(office)/office/_components/OfficeErrorState";

type UserRow = {
  id: string;
  fullName?: string;
  email?: string;
  phone?: string;
  role: string;
  status: string;
};

type UsersResponse = {
  items: UserRow[];
  total: number;
  page: number;
  limit: number;
};

type UserDetail = UserRow & {
  plotNumber?: string;
  street?: string;
  pendingPersonId?: string | null;
  telegramChatId?: string | null;
};

const roleOptions = ["resident", "secretary", "accountant", "chairman", "admin"];

export default function UsersClient() {
  const [items, setItems] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<UserDetail | null>(null);

  const loadUsers = async (nextPage: number, nextQuery: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (nextQuery) params.set("q", nextQuery);
      params.set("page", String(nextPage));
      params.set("limit", String(limit));
      const data = await apiGet<UsersResponse>(`/api/admin/users?${params.toString()}`);
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
      setPage(data.page ?? nextPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки пользователей");
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<{ user: UserDetail }>(`/api/admin/users/${id}`);
      setSelected(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки пользователя");
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (id: string, role: string) => {
    setLoading(true);
    setError(null);
    try {
      await apiPost(`/api/admin/users/${id}/role`, { role });
      await loadUsers(page, query);
      if (selected?.id === id) {
        await loadDetail(id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка обновления роли");
    } finally {
      setLoading(false);
    }
  };

  const toggleDisabled = async (id: string, disabled: boolean) => {
    setLoading(true);
    setError(null);
    try {
      await apiPost(`/api/admin/users/${id}/disable`, { disabled });
      await loadUsers(page, query);
      if (selected?.id === id) {
        await loadDetail(id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка изменения статуса");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadUsers(1, query);
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    loadUsers(page, query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <input
            className="w-full max-w-md rounded border border-zinc-300 px-3 py-2 text-sm"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по имени, почте, телефону"
          />
          <span className="text-xs text-zinc-500">Всего: {total}</span>
        </div>
      </div>

      {loading ? <OfficeLoadingState message="Загрузка пользователей..." /> : null}
      {error ? <OfficeErrorState message={error} onRetry={() => loadUsers(page, query)} /> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                <tr>
                  <th className="px-3 py-2 text-left">Имя</th>
                  <th className="px-3 py-2 text-left">Контакт</th>
                  <th className="px-3 py-2 text-left">Роль</th>
                  <th className="px-3 py-2 text-left">Статус</th>
                  <th className="px-3 py-2 text-left">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {items.map((user) => (
                  <tr key={user.id} data-testid={`admin-users-row-${user.id}`}>
                    <td className="px-3 py-2">
                      <div className="font-medium text-zinc-900">{user.fullName || "—"}</div>
                      <div className="text-xs text-zinc-500">{user.id}</div>
                    </td>
                    <td className="px-3 py-2 text-zinc-700">
                      <div>{user.email || "—"}</div>
                      <div>{user.phone || "—"}</div>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className="rounded border border-zinc-200 px-2 py-1 text-xs"
                        value={user.role}
                        onChange={(event) => updateRole(user.id, event.target.value)}
                        data-testid="admin-user-role-select"
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-xs text-zinc-600">{user.status}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 text-xs text-zinc-600">
                          <input
                            type="checkbox"
                            checked={user.status === "disabled"}
                            onChange={(event) => toggleDisabled(user.id, event.target.checked)}
                            data-testid="admin-user-disable-toggle"
                          />
                          Отключен
                        </label>
                        <button
                          type="button"
                          className="rounded border border-zinc-200 px-2 py-1 text-xs"
                          onClick={() => loadDetail(user.id)}
                        >
                          Детали
                        </button>
                      </div>
                    </td>
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

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-zinc-900">Карточка пользователя</div>
          {selected ? (
            <div className="mt-3 space-y-2 text-sm text-zinc-700">
              <div><span className="text-zinc-500">ID:</span> {selected.id}</div>
              <div><span className="text-zinc-500">Имя:</span> {selected.fullName || "—"}</div>
              <div><span className="text-zinc-500">Email:</span> {selected.email || "—"}</div>
              <div><span className="text-zinc-500">Телефон:</span> {selected.phone || "—"}</div>
              <div><span className="text-zinc-500">Роль:</span> {selected.role}</div>
              <div><span className="text-zinc-500">Статус:</span> {selected.status}</div>
              <div><span className="text-zinc-500">Участок:</span> {selected.plotNumber || "—"}</div>
              <div><span className="text-zinc-500">Улица:</span> {selected.street || "—"}</div>
              <div><span className="text-zinc-500">Telegram:</span> {selected.telegramChatId || "—"}</div>
              <div><span className="text-zinc-500">Pending Person:</span> {selected.pendingPersonId || "—"}</div>
            </div>
          ) : (
            <div className="mt-3 text-sm text-zinc-500">Выберите пользователя для просмотра.</div>
          )}
        </div>
      </div>
    </div>
  );
}
