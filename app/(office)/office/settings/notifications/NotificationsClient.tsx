"use client";

import { useState, useEffect } from "react";
import type { UserNotificationPrefs } from "@/server/services/notifications";
import { apiPost } from "@/lib/api/client";

type Props = {
  initialPrefs: UserNotificationPrefs | null;
};

export default function NotificationsClient({ initialPrefs }: Props) {
  const [prefs, setPrefs] = useState<UserNotificationPrefs | null>(initialPrefs);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setPrefs(initialPrefs);
  }, [initialPrefs]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const formData = new FormData(e.currentTarget);
      const enabled = formData.get("enabled") === "on";
      const telegramChatId = (formData.get("telegramChatId") as string | null)?.trim() || null;
      const appealCreated = formData.get("appealCreated") === "on";
      const appealAssigned = formData.get("appealAssigned") === "on";
      const appealOverdue = formData.get("appealOverdue") === "on";

      const data = await apiPost<{ prefs: UserNotificationPrefs }>("/api/office/notifications/prefs", {
        enabled,
        telegramChatId,
        events: {
          appealCreated,
          appealAssigned,
          appealOverdue,
        },
      });
      setPrefs(data.prefs);
      setMessage({ type: "success", text: "Настройки сохранены" });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Ошибка сети" });
    } finally {
      setLoading(false);
    }
  };

  if (!prefs) {
    return <div className="text-sm text-zinc-600">Загрузка...</div>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Основной переключатель */}
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={prefs.enabled}
            className="h-4 w-4 rounded border-zinc-300 text-[#5E704F] focus:ring-[#5E704F]"
          />
          <div>
            <div className="font-semibold text-zinc-900">Включить уведомления</div>
            <div className="text-sm text-zinc-600">Получать уведомления через Telegram</div>
          </div>
        </label>
      </div>

      {/* Telegram Chat ID */}
      {prefs.enabled && (
        <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-zinc-700">
              Telegram Chat ID
            </label>
            <input
              type="text"
              name="telegramChatId"
              defaultValue={prefs.telegramChatId || ""}
              placeholder="123456789"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-[#5E704F] focus:outline-none"
            />
            <p className="text-xs text-zinc-500">
              Sprint 5.1: Узнать свой Chat ID можно через бота @userinfobot в Telegram или введите вручную
            </p>
          </div>
          
          {/* Sprint 5.1: Тестовая кнопка отправки сообщения */}
          {prefs.telegramChatId && (
            <div className="mt-3 pt-3 border-t border-zinc-200">
              <button
                type="button"
                onClick={async () => {
                  setLoading(true);
                  setMessage(null);
                  try {
                    await apiPost<{ messageId: string }>("/api/office/notifications/test", {
                      chatId: prefs.telegramChatId,
                    });
                    setMessage({ type: "success", text: "Тестовое сообщение отправлено!" });
                  } catch (error) {
                    setMessage({ type: "error", text: error instanceof Error ? error.message : "Ошибка сети" });
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="rounded-lg border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white disabled:opacity-50"
              >
                {loading ? "Отправка..." : "Отправить тестовое сообщение"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* События */}
      {prefs.enabled && (
        <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4">
          <div className="font-semibold text-zinc-900">Типы уведомлений</div>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="appealCreated"
                defaultChecked={prefs.events.appealCreated}
                className="h-4 w-4 rounded border-zinc-300 text-[#5E704F] focus:ring-[#5E704F]"
              />
              <div>
                <div className="text-sm font-medium text-zinc-900">Новое обращение</div>
                <div className="text-xs text-zinc-600">Уведомление при создании нового обращения</div>
              </div>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="appealAssigned"
                defaultChecked={prefs.events.appealAssigned}
                className="h-4 w-4 rounded border-zinc-300 text-[#5E704F] focus:ring-[#5E704F]"
              />
              <div>
                <div className="text-sm font-medium text-zinc-900">Обращение назначено</div>
                <div className="text-xs text-zinc-600">Уведомление при назначении обращения на вас</div>
              </div>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="appealOverdue"
                defaultChecked={prefs.events.appealOverdue}
                className="h-4 w-4 rounded border-zinc-300 text-[#5E704F] focus:ring-[#5E704F]"
              />
              <div>
                <div className="text-sm font-medium text-zinc-900">Просрочено обращение</div>
                <div className="text-xs text-zinc-600">Уведомление о просроченных обращениях</div>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Сообщение */}
      {message && (
        <div
          className={`rounded-lg px-4 py-2 text-sm ${
            message.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Кнопка сохранения */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[#5E704F] px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4d5d41] disabled:opacity-50"
        >
          {loading ? "Сохранение..." : "Сохранить"}
        </button>
      </div>
    </form>
  );
}
