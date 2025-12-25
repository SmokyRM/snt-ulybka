"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSession, loadSession } from "@/lib/session";
import {
  getApprovedForIdentifier,
  getRequestsByIdentifier,
} from "@/lib/mockDb";
import { OwnershipRequest } from "@/types/snt";

export default function CabinetPage() {
  const router = useRouter();
  const session = useMemo(() => loadSession(), []);
  const [requests, setRequests] = useState<OwnershipRequest[]>([]);
  const [approved, setApproved] = useState<OwnershipRequest | undefined>();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!session) {
      router.replace("/login");
      return;
    }
    setRequests(getRequestsByIdentifier(session.identifier));
    setApproved(getApprovedForIdentifier(session.identifier));
    setReady(true);
  }, [router, session]);

  if (!ready || !session) {
    return (
      <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
        <div className="mx-auto w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-zinc-700">Загрузка...</p>
        </div>
      </main>
    );
  }

  const latestRequest = [...requests].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  )[requests.length ? requests.length - 1 : -1];

  const statusBadge = (status: OwnershipRequest["status"]) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="rounded-full bg-[#5E704F]/10 px-3 py-1 text-xs font-semibold text-[#5E704F]">
            Подтверждено
          </span>
        );
      case "REJECTED":
        return (
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
            Отклонено
          </span>
        );
      default:
        return (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            В ожидании
          </span>
        );
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Личный кабинет</h1>
            <p className="text-sm text-zinc-600">{session.identifier}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              clearSession();
              router.replace("/login");
            }}
            className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:border-zinc-400"
          >
            Выйти
          </button>
        </div>

        {approved ? (
          <section className="rounded-2xl border border-[#5E704F]/30 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              {statusBadge("APPROVED")}
              <p className="text-sm text-zinc-600">
                Доступ к участку подтвержден администратором.
              </p>
            </div>
            <h2 className="mt-3 text-xl font-semibold text-zinc-900">
              Полный кабинет
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-zinc-700">
              <li>Участок: {approved.plotNumber}</li>
              {approved.street && <li>Улица: {approved.street}</li>}
              {approved.cadastral && <li>Кадастровый номер: {approved.cadastral}</li>}
            </ul>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <a
                href="/"
                className="block rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-[#5E704F] transition-colors hover:border-[#5E704F]/50"
              >
                Новости
              </a>
              <a
                href="/#docs"
                className="block rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-[#5E704F] transition-colors hover:border-[#5E704F]/50"
              >
                Документы
              </a>
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              {statusBadge(latestRequest?.status ?? "PENDING")}
              <p className="text-sm text-zinc-700">
                Заявка на подтверждение права
              </p>
            </div>
            {latestRequest ? (
              <div className="mt-4 space-y-2 text-sm text-zinc-700">
                <p>
                  Участок: {latestRequest.plotNumber}
                  {latestRequest.street ? `, ${latestRequest.street}` : ""}
                </p>
                <p>
                  Дата подачи:{" "}
                  {new Date(latestRequest.createdAt).toLocaleDateString("ru-RU")}
                </p>
                {latestRequest.status === "REJECTED" &&
                  latestRequest.rejectionReason && (
                    <p className="text-red-700">
                      Причина отказа: {latestRequest.rejectionReason}
                    </p>
                  )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-zinc-700">
                Заявка ещё не отправлена.
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="/register-plot"
                className="rounded-full bg-[#5E704F] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41]"
              >
                Изменить заявку
              </a>
              <a
                href="/"
                className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:border-zinc-400"
              >
                Новости и документы
              </a>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
