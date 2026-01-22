"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppRouter } from "@/hooks/useAppRouter";
import { LogoutButton } from "@/components/LogoutButton";
import { getSessionClient } from "@/lib/session";
import { User } from "@/types/snt";
import { ApiError, apiGet, apiPost } from "@/lib/api/client";

export default function AdminRequestsPage() {
  const router = useAppRouter();
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
  const [pending, setPending] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    try {
      const data = await apiGet<{ users: User[] }>("/api/admin/pending-users");
      setPending(data.users || []);
      setIsAllowed(true);
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setIsAllowed(false);
        return;
      }
      setError(error instanceof Error ? error.message : "Не удалось загрузить данные");
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      const session = getSessionClient();
      if (!session) {
        router.replace("/auth");
        return;
      }
      await fetchPending();
    };
    void run();
  }, [router, fetchPending]);

  const updateStatus = async (userId: string, status: "verified" | "rejected") => {
    try {
      await apiPost<{ user: User }>("/api/admin/user-status", { userId, status });
      fetchPending();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Не удалось обновить статус");
    }
  };

  if (isAllowed === null) {
    return (
      <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
        <div className="mx-auto w-full max-w-3xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-zinc-700">Загрузка...</p>
        </div>
      </main>
    );
  }

  if (isAllowed === false) {
    return (
      <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
        <div className="mx-auto w-full max-w-3xl rounded-2xl border border-amber-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold">Недостаточно прав</h1>
          <p className="mt-3 text-sm text-zinc-700">
            Доступ к списку заявок есть только у членов правления.
          </p>
          <button
            type="button"
            onClick={() => router.replace("/auth")}
            className="mt-6 rounded-full bg-[#5E704F] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41]"
          >
            Вернуться
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Заявки на подтверждение</h1>
            <p className="text-sm text-zinc-600">Доступ только для правления</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={fetchPending}
              className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:border-zinc-400"
            >
              Обновить список
            </button>
            <LogoutButton
              redirectTo="/"
              className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-60"
              busyLabel="Выходим..."
            />
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {pending.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-700">Нет заявок в статусе pending.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {pending.map((user) => (
              <article
                key={user.id}
                className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">
                      Ожидает проверки
                    </p>
                    <h2 className="text-lg font-semibold text-zinc-900">
                      {user.fullName || "Без имени"}
                    </h2>
                    <p className="text-sm text-zinc-700">
                      {user.phone || "Телефон не указан"} · {user.email || "Email не указан"}
                    </p>
                    {user.street && user.plotNumber && (
                      <p className="text-xs text-zinc-600">
                        Участок: {user.street}, {user.plotNumber}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => updateStatus(user.id, "verified")}
                    className="rounded-full bg-[#5E704F] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41]"
                  >
                    Подтвердить
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus(user.id, "rejected")}
                    className="rounded-full border border-red-300 px-5 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:border-red-400 hover:bg-red-50"
                  >
                    Отклонить
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
