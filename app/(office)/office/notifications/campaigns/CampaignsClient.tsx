"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/lib/api/client";
import { listNotificationTemplates } from "@/lib/notificationTemplates";
import OfficeLoadingState from "../../_components/OfficeLoadingState";
import OfficeErrorState from "../../_components/OfficeErrorState";
import OfficeEmptyState from "../../_components/OfficeEmptyState";

type Campaign = {
  id: string;
  name: string;
  templateKey: string;
  channel: "telegram" | "email";
  audience: "debtors" | "all" | "filtered";
  status: string;
  scheduleAt: string | null;
  createdAt: string;
  stats: {
    targetedCount: number;
    sentCount: number;
    failedCount: number;
    skippedCount: number;
  };
  lastError: string | null;
};

type Preview = {
  targetedCount: number;
  sample: Array<{ plotId: string; residentName: string; text: string }>;
};

export default function CampaignsClient({ initialItems }: { initialItems: Campaign[] }) {
  const templates = useMemo(() => listNotificationTemplates(), []);
  const [items, setItems] = useState<Campaign[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const canRunScheduler = typeof window !== "undefined" && process.env.NODE_ENV === "development";

  const [name, setName] = useState("");
  const [channel, setChannel] = useState<"telegram" | "email">("telegram");
  const [audience, setAudience] = useState<"debtors" | "all" | "filtered">("debtors");
  const [templateKey, setTemplateKey] = useState<string>(templates[0]?.id ?? "debt_notice");
  const [minDebt, setMinDebt] = useState(0);
  const [scheduleAt, setScheduleAt] = useState("");

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<{ items: Campaign[] }>("/api/office/notifications/campaigns");
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки кампаний");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const handlePreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiPost<Preview>("/api/office/notifications/campaigns", {
        mode: "preview",
        templateKey,
        channel,
        audience,
        filters: { minDebt },
      });
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка предпросмотра");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiPost("/api/office/notifications/campaigns", {
        name,
        templateKey,
        channel,
        audience,
        filters: { minDebt },
      });
      setName("");
      setPreview(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка создания кампании");
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async (id: string) => {
    if (!scheduleAt) return;
    setLoading(true);
    setError(null);
    try {
      await apiPost(`/api/office/notifications/campaigns/${id}/schedule`, { scheduleAt });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка планирования");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await apiPost(`/api/office/notifications/campaigns/${id}/cancel`, {});
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка отмены");
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await apiPost(`/api/office/notifications/campaigns/${id}/duplicate`, {});
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка дублирования");
    } finally {
      setLoading(false);
    }
  };

  const handleRunScheduler = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiPost("/api/office/notifications/scheduler/run", {});
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка запуска рассылки");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="office-campaigns-root">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold text-zinc-900">Создание кампании</div>
          {canRunScheduler && (
            <button
              type="button"
              onClick={handleRunScheduler}
              className="rounded-lg border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700"
            >
              Запустить отправку сейчас
            </button>
          )}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-zinc-700">
            Название
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-zinc-700">
            Канал
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as typeof channel)}
              className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
            >
              <option value="telegram">Telegram</option>
              <option value="email">Email</option>
            </select>
          </label>
          <label className="text-sm text-zinc-700">
            Аудитория
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value as typeof audience)}
              className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
            >
              <option value="debtors">Должники</option>
              <option value="all">Все</option>
              <option value="filtered">Фильтр</option>
            </select>
          </label>
          <label className="text-sm text-zinc-700">
            Минимальный долг
            <input
              type="number"
              value={minDebt}
              onChange={(e) => setMinDebt(Number(e.target.value))}
              className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-zinc-700">
            Шаблон
            <select
              value={templateKey}
              onChange={(e) => setTemplateKey(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
            >
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-zinc-700">
            Запланировать на
            <input
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handlePreview}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700"
            data-testid="office-campaign-preview"
          >
            Предпросмотр
          </button>
          <button
            type="button"
            onClick={handleCreate}
            className="rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white"
            data-testid="office-campaign-create"
          >
            Создать кампанию
          </button>
        </div>
      </div>

      {preview ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-zinc-900">Предпросмотр получателей</div>
          <div className="mt-2 text-sm text-zinc-600">Всего: {preview.targetedCount}</div>
          <div className="mt-3 space-y-2 text-sm text-zinc-700">
            {preview.sample.map((item) => (
              <div key={item.plotId} className="rounded-lg border border-zinc-200 p-3">
                <div className="text-xs text-zinc-500">{item.residentName}</div>
                <div className="mt-2 whitespace-pre-line">{item.text}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {loading && <OfficeLoadingState message="Загрузка..." testId="office-campaigns-loading" />}
      {error && <OfficeErrorState message={error} onRetry={refresh} testId="office-campaigns-error" />}

      {items.length === 0 ? (
        <OfficeEmptyState message="Кампаний пока нет." />
      ) : (
        <div className="space-y-3">
          {items.map((campaign) => (
            <div key={campaign.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-zinc-900">{campaign.name}</div>
                  <div className="text-xs text-zinc-500">Статус: {campaign.status}</div>
                </div>
                <div className="text-xs text-zinc-500">
                  Отправлено: {campaign.stats.sentCount} · Ошибок: {campaign.stats.failedCount} · Пропущено: {campaign.stats.skippedCount}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleSchedule(campaign.id)}
                  className="rounded-lg border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700"
                  data-testid="office-campaign-schedule"
                >
                  Запланировать
                </button>
                <button
                  type="button"
                  onClick={() => handleCancel(campaign.id)}
                  className="rounded-lg border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700"
                  data-testid="office-campaign-cancel"
                >
                  Отменить
                </button>
                <button
                  type="button"
                  onClick={() => handleDuplicate(campaign.id)}
                  className="rounded-lg border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700"
                >
                  Дублировать
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
