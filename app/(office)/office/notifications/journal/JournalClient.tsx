"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api/client";
import OfficeLoadingState from "../../_components/OfficeLoadingState";
import OfficeErrorState from "../../_components/OfficeErrorState";
import OfficeEmptyState from "../../_components/OfficeEmptyState";

type CommunicationLog = {
  id: string;
  userId: string | null;
  plotId: string | null;
  campaignId: string | null;
  channel: "telegram" | "email";
  templateKey: string;
  renderedText: string;
  status: "sent" | "failed" | "skipped";
  sentAt: string | null;
  providerMessageId: string | null;
  error: string | null;
};

export default function JournalClient({ initialItems }: { initialItems: CommunicationLog[] }) {
  const [items, setItems] = useState<CommunicationLog[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [channel, setChannel] = useState<string>("");

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (channel) params.set("channel", channel);
      const data = await apiGet<{ items: CommunicationLog[] }>(
        `/api/office/notifications/journal?${params.toString()}`,
      );
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки журнала");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  return (
    <div className="space-y-4" data-testid="office-notifications-journal-root">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-zinc-900">Фильтры</div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-sm text-zinc-700">
            Статус
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
            >
              <option value="">Все</option>
              <option value="sent">Отправлено</option>
              <option value="failed">Ошибка</option>
              <option value="skipped">Пропущено</option>
            </select>
          </label>
          <label className="text-sm text-zinc-700">
            Канал
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
            >
              <option value="">Все</option>
              <option value="telegram">Telegram</option>
              <option value="email">Email</option>
            </select>
          </label>
          <button
            type="button"
            onClick={refresh}
            className="h-10 rounded-lg border border-zinc-200 px-4 text-sm font-semibold text-zinc-700"
          >
            Применить
          </button>
        </div>
      </div>

      {loading && <OfficeLoadingState message="Загрузка..." testId="office-notifications-journal-loading" />}
      {error && <OfficeErrorState message={error} onRetry={refresh} testId="office-notifications-journal-error" />}

      {items.length === 0 ? (
        <OfficeEmptyState message="Записей пока нет." />
      ) : (
        <div className="space-y-3">
          {items.map((log) => (
            <div key={log.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <div className="font-semibold text-zinc-900">{log.templateKey}</div>
                <div className="text-xs text-zinc-500">
                  {log.channel} · {log.status}
                </div>
              </div>
              <div className="mt-2 text-xs text-zinc-500">
                {log.sentAt ? new Date(log.sentAt).toLocaleString("ru-RU") : "Не отправлено"}
              </div>
              <div className="mt-3 whitespace-pre-line text-sm text-zinc-700">{log.renderedText}</div>
              {log.error ? <div className="mt-2 text-xs text-red-600">{log.error}</div> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
