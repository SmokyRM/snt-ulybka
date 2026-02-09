"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { apiGet, apiPost } from "@/lib/api/client";

interface UserNotification {
  id: string;
  title: string;
  body: string;
  sourceType: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export default function NotificationsV2Client() {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    apiGet<{ notifications: UserNotification[]; unreadCount: number }>("/api/cabinet/notifications/v2")
      .then((data) => {
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const markRead = (id: string) => {
    startTransition(async () => {
      try {
        const data = await apiPost<{ notification: UserNotification }>(
          `/api/cabinet/notifications/v2/${id}/read`,
          {},
        );
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, readAt: data.notification.readAt } : n,
          ),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (_err) {
        // ignore
      }
    });
  };

  const markAllRead = () => {
    startTransition(async () => {
      try {
        await apiPost("/api/cabinet/notifications/v2/read-all", {});
        setNotifications((prev) =>
          prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })),
        );
        setUnreadCount(0);
      } catch (_err) {
        // ignore
      }
    });
  };

  if (!loaded) {
    return <p className="text-sm text-zinc-500">Загрузка...</p>;
  }

  return (
    <div className="space-y-4">
      {unreadCount > 0 && (
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
            Непрочитанных: {unreadCount}
          </span>
          <button
            onClick={markAllRead}
            disabled={isPending}
            className="text-sm font-medium text-[#5E704F] hover:underline disabled:opacity-50"
          >
            Прочитать все
          </button>
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center">
          <p className="text-sm text-zinc-500">Пока нет уведомлений</p>
          <Link
            href="/cabinet/appeals"
            className="mt-2 inline-block text-sm font-semibold text-[#5E704F] hover:underline"
          >
            Перейти к обращениям
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const isUnread = !n.readAt;
            return (
              <div
                key={n.id}
                data-testid={`notification-${n.id}`}
                className={`rounded-xl border bg-white p-4 shadow-sm ${
                  isUnread ? "border-emerald-200" : "border-zinc-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${isUnread ? "text-zinc-900" : "text-zinc-700"}`}>
                        {n.title}
                      </span>
                      {isUnread && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          Новое
                        </span>
                      )}
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                        {n.sourceType}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-600">{n.body}</p>
                    <p className="text-xs text-zinc-400">
                      {new Date(n.createdAt).toLocaleString("ru-RU", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </p>
                    {n.link && (
                      <Link
                        href={n.link}
                        className="text-sm font-semibold text-[#5E704F] hover:underline"
                      >
                        {n.link.includes("pay") ? "Оплатить" : "Открыть"}
                      </Link>
                    )}
                  </div>
                  {isUnread && (
                    <button
                      onClick={() => markRead(n.id)}
                      disabled={isPending}
                      className="shrink-0 rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700 transition hover:border-[#5E704F] hover:text-[#5E704F] disabled:opacity-50"
                    >
                      Прочитано
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
