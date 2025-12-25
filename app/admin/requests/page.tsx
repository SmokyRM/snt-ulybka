"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadSession, Session } from "@/lib/session";
import {
  approveRequest,
  getRequests,
  rejectRequest,
} from "@/lib/mockDb";
import { OwnershipRequest } from "@/types/snt";

export default function AdminRequestsPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [requests, setRequests] = useState<OwnershipRequest[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const current = loadSession();
    if (current) {
      setSession(current);
    }
    if (!current) {
      router.replace("/login");
      return;
    }
    if (!current.isAdmin) {
      setReady(true);
      return;
    }
    setRequests(getRequests("PENDING"));
    setReady(true);
  }, [router]);

  const refresh = () => {
    setRequests(getRequests("PENDING"));
  };

  const handleApprove = (id: string) => {
    approveRequest(id);
    refresh();
  };

  const handleReject = (id: string) => {
    const reason = reasons[id]?.trim();
    if (!reason) {
      setErrors((prev) => ({
        ...prev,
        [id]: "Укажите причину отказа",
      }));
      return;
    }
    rejectRequest(id, reason);
    setErrors((prev) => ({ ...prev, [id]: "" }));
    refresh();
  };

  if (!ready) {
    return (
      <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
        <div className="mx-auto w-full max-w-3xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-zinc-700">Загрузка...</p>
        </div>
      </main>
    );
  }

  if (!session?.isAdmin) {
    return (
      <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
        <div className="mx-auto w-full max-w-3xl rounded-2xl border border-amber-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold">Недостаточно прав</h1>
          <p className="mt-3 text-sm text-zinc-700">
            Доступ к списку заявок есть только у администраторов.
          </p>
          <button
            type="button"
            onClick={() => router.replace("/login")}
            className="mt-6 rounded-full bg-[#5E704F] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41]"
          >
            Войти
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
            <p className="text-sm text-zinc-600">Доступ только для администраторов</p>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:border-zinc-400"
          >
            Обновить список
          </button>
        </div>

        {requests.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-700">Нет заявок в статусе PENDING.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {requests.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">
                      Ожидает проверки
                    </p>
                    <h2 className="text-lg font-semibold text-zinc-900">
                      Участок {item.plotNumber}
                    </h2>
                    <p className="text-sm text-zinc-700">
                      {item.fullName} · {item.phone} · {item.email}
                    </p>
                    {item.street && (
                      <p className="text-xs text-zinc-600">Улица: {item.street}</p>
                    )}
                    {item.cadastral && (
                      <p className="text-xs text-zinc-600">
                        Кадастр: {item.cadastral}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {new Date(item.createdAt).toLocaleString("ru-RU")}
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <label className="text-xs font-medium text-zinc-800">
                    Причина отказа (при необходимости)
                  </label>
                  <textarea
                    value={reasons[item.id] ?? ""}
                    onChange={(e) =>
                      setReasons((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                    className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none transition-shadow focus:border-[#5E704F] focus:ring-2 focus:ring-[#5E704F]/30"
                    rows={2}
                  />
                  {errors[item.id] && (
                    <p className="text-xs text-red-700">{errors[item.id]}</p>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleApprove(item.id)}
                    className="rounded-full bg-[#5E704F] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41]"
                  >
                    Подтвердить
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(item.id)}
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
