"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import AppLink from "@/components/AppLink";
import type { InternalNotification } from "@/server/notifications/internal.store";
import { apiGet, apiPost } from "@/lib/api/client";

type Props = {
  initialNotifications: InternalNotification[];
  initialUnreadCount: number;
  currentUserId: string;
};

export default function NotificationsClient({ initialNotifications, initialUnreadCount, currentUserId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notifications, setNotifications] = useState<InternalNotification[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  // Обновление уведомлений при изменении данных
  const refreshNotifications = async () => {
    try {
      const data = await apiGet<{ notifications?: InternalNotification[] }>("/api/office/notifications");
      const nextNotifications = data.notifications || [];
      setNotifications(nextNotifications);
      const unread = nextNotifications.filter((n) => !n.readAt).length;
      setUnreadCount(unread);
    } catch (error) {
      // Игнорируем ошибки обновления
      console.error("[notifications] Failed to refresh:", error);
    }
  };

  // Отметить уведомление как прочитанное
  const handleMarkRead = async (notificationId: string) => {
    const notification = notifications.find((n) => n.id === notificationId);
    if (!notification || notification.readAt) return; // Уже прочитано

    try {
      const data = await apiPost<{ notification?: InternalNotification }>("/api/office/notifications/read", { id: notificationId });
      const nextNotification = data.notification;
      if (nextNotification) {
        // Обновляем локальное состояние
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? nextNotification : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));

        // Обновляем страницу если это обращение
        if (notification.appealId) {
          startTransition(() => {
            router.refresh();
          });
        }
      }
    } catch (error) {
      console.error("[notifications] Failed to mark as read:", error);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm" data-testid="notif-root">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Уведомления</h1>
          <p className="text-sm text-zinc-600">
            {unreadCount > 0 ? `${unreadCount} непрочитанных` : "Все уведомления прочитаны"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={refreshNotifications}
            disabled={isPending}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:border-[#5E704F] hover:bg-zinc-50 disabled:opacity-50"
          >
            Обновить
          </button>
        )}
      </div>

      <div className="space-y-2" data-testid="notif-list">
        {notifications.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center" data-testid="notif-empty">
            <p className="text-sm font-medium text-zinc-700">Уведомлений пока нет</p>
          </div>
        ) : (
          notifications.map((notification) => {
            const isUnread = !notification.readAt;
            const appealLink = notification.appealId
              ? `/office/appeals/${notification.appealId}`
              : null;

            return (
              <div
                key={notification.id}
                className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-sm ${
                  isUnread ? "border-[#5E704F] bg-[#5E704F]/5" : "border-zinc-200 bg-white"
                }`}
                data-testid={`notif-row-${notification.id}`}
              >
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3
                          className={`text-sm font-semibold ${
                            isUnread ? "text-zinc-900" : "text-zinc-700"
                          }`}
                        >
                          {notification.title}
                        </h3>
                        {isUnread && (
                          <span className="inline-flex h-2 w-2 rounded-full bg-[#5E704F]" />
                        )}
                      </div>
                      <p className="mt-1 text-sm text-zinc-600">{notification.message}</p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                        <span>{new Date(notification.createdAt).toLocaleString("ru-RU")}</span>
                        {appealLink && (
                          <AppLink
                            href={appealLink}
                            className="font-semibold text-[#5E704F] hover:underline"
                            onClick={() => handleMarkRead(notification.id)}
                          >
                            Открыть обращение →
                          </AppLink>
                        )}
                      </div>
                    </div>
                    {isUnread && (
                      <button
                        onClick={() => handleMarkRead(notification.id)}
                        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-[#5E704F] hover:bg-zinc-50"
                        data-testid={`notif-read-${notification.id}`}
                      >
                        Отметить прочитанным
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
