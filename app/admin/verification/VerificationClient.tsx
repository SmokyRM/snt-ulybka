"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { readOk } from "@/lib/api/client";

interface PendingUser {
  id: string;
  fullName?: string | null;
  phone?: string | null;
  email?: string | null;
  status: string;
  pendingPersonId?: string | null;
  personData?: {
    fullName: string;
    phone?: string | null;
    email?: string | null;
  } | null;
  plotsData?: Array<{
    plotNumber: string;
    sntStreetNumber: string;
  }>;
}

export default function VerificationClient() {
  const router = useRouter();
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({}); // userId -> action
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({}); // userId -> reason

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/verification/list");
      const data = await readOk<{ users: PendingUser[] }>(res);
      setUsers(data.users);
    } catch (e) {
      setError((e as Error).message || "Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    if (!confirm("Подтвердить регистрацию этого пользователя?")) return;
    setActionLoading((prev) => ({ ...prev, [userId]: "approve" }));
    try {
      const res = await fetch("/api/admin/verification/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      await readOk<{ ok: true; user: PendingUser }>(res);
      await loadUsers();
    } catch (e) {
      alert(`Ошибка: ${e instanceof Error ? e.message : "Неизвестная ошибка"}`);
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    }
  };

  const handleReject = async (userId: string) => {
    const reason = rejectReason[userId] || "";
    if (!confirm("Отклонить регистрацию этого пользователя?")) return;
    setActionLoading((prev) => ({ ...prev, [userId]: "reject" }));
    try {
      const res = await fetch("/api/admin/verification/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, reason: reason || undefined }),
      });
      await readOk<{ ok: true; user: PendingUser }>(res);
      setRejectReason((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      await loadUsers();
    } catch (e) {
      alert(`Ошибка: ${e instanceof Error ? e.message : "Неизвестная ошибка"}`);
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-zinc-600">
        Загрузка...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
        {error}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-zinc-500">
        Нет пользователей, ожидающих верификации
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Пользователь</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Данные из реестра</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Участки</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3">
                  <div className="space-y-1">
                    <div className="font-medium text-zinc-900">{user.fullName || "—"}</div>
                    <div className="text-xs text-zinc-500">{user.phone || "—"}</div>
                    <div className="text-xs text-zinc-500">{user.email || "—"}</div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {user.personData ? (
                    <div className="space-y-1">
                      <div className="text-zinc-900">{user.personData.fullName}</div>
                      <div className="text-xs text-zinc-500">{user.personData.phone || "—"}</div>
                      <div className="text-xs text-zinc-500">{user.personData.email || "—"}</div>
                    </div>
                  ) : (
                    <span className="text-zinc-400">Нет данных</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {user.plotsData && user.plotsData.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {user.plotsData.map((plot, idx) => (
                        <span key={idx} className="rounded bg-zinc-100 px-2 py-0.5 text-xs">
                          Линия {plot.sntStreetNumber}, участок {plot.plotNumber}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-zinc-400">Нет участков</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => handleApprove(user.id)}
                      disabled={actionLoading[user.id] === "approve"}
                      className="rounded bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                    >
                      {actionLoading[user.id] === "approve" ? "..." : "Подтвердить"}
                    </button>
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={rejectReason[user.id] || ""}
                        onChange={(e) =>
                          setRejectReason((prev) => ({ ...prev, [user.id]: e.target.value }))
                        }
                        placeholder="Причина отклонения (необязательно)"
                        className="w-full rounded border border-zinc-300 px-2 py-1 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleReject(user.id)}
                        disabled={actionLoading[user.id] === "reject"}
                        className="w-full rounded bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                      >
                        {actionLoading[user.id] === "reject" ? "..." : "Отклонить"}
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
