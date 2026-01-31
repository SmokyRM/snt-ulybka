"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/lib/api/client";
import type { NotificationTemplate } from "@/lib/notificationTemplates";
import OfficeLoadingState from "../../_components/OfficeLoadingState";
import OfficeErrorState from "../../_components/OfficeErrorState";
import OfficeEmptyState from "../../_components/OfficeEmptyState";

export type DebtorRow = {
  plotLabel: string;
  plotId: string;
  residentId: string;
  residentName: string;
  totalDebt: number;
  overdueDays: number;
  segment: string;
  amountBucket: string;
  hasPhone: boolean;
  hasTelegram: boolean;
};

type DebtorsResponse = {
  items: DebtorRow[];
  count: number;
};

type CampaignPreview = {
  targetedCount: number;
  sample: Array<{ plotId: string; residentName: string; text: string }>;
};

type Props = {
  canGenerateCampaign: boolean;
};

const segmentOptions = [
  { value: "", label: "Все" },
  { value: "S0", label: "S0 (без долга)" },
  { value: "S1", label: "S1 (1–30 дней)" },
  { value: "S2", label: "S2 (31–90 дней)" },
  { value: "S3", label: "S3 (91–180 дней)" },
  { value: "S4", label: "S4 (180+ дней)" },
];

export default function DebtorsClient({ canGenerateCampaign }: Props) {
  const [items, setItems] = useState<DebtorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [segment, setSegment] = useState("");
  const [minDebt, setMinDebt] = useState("");
  const [street, setStreet] = useState("");
  const [query, setQuery] = useState("");
  const [hasPhone, setHasPhone] = useState(false);
  const [hasTelegram, setHasTelegram] = useState(false);

  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [channel, setChannel] = useState<"telegram" | "email">("telegram");
  const [campaignName, setCampaignName] = useState("");
  const [preview, setPreview] = useState<CampaignPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const params = useMemo(() => {
    const params = new URLSearchParams();
    if (segment) params.set("segment", segment);
    if (minDebt.trim()) params.set("minDebt", minDebt.trim());
    if (street.trim()) params.set("street", street.trim());
    if (query.trim()) params.set("q", query.trim());
    if (hasPhone) params.set("hasPhone", "1");
    if (hasTelegram) params.set("hasTelegram", "1");
    return params.toString();
  }, [segment, minDebt, street, query, hasPhone, hasTelegram]);

  const loadDebtors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<DebtorsResponse>(`/api/office/billing/debtors?${params}`);
      setItems(data.items || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ошибка загрузки";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [params]);

  const loadTemplates = useCallback(async () => {
    try {
      const data = await apiGet<{ templates: NotificationTemplate[] }>("/api/office/notifications/templates");
      const list = data.templates || [];
      setTemplates(list);
      if (!templateId && list.length > 0) {
        setTemplateId(list[0].id);
      }
    } catch (err) {
      // Templates are optional; keep silent to avoid blocking list
      console.error("[debtors] Failed to load templates", err);
    }
  }, [templateId]);

  useEffect(() => {
    void loadDebtors();
  }, [loadDebtors]);

  useEffect(() => {
    if (canGenerateCampaign) {
      void loadTemplates();
    }
  }, [canGenerateCampaign, loadTemplates]);

  const handlePreview = async () => {
    if (!templateId) {
      setPreviewError("Выберите шаблон.");
      return;
    }
    setPreviewLoading(true);
    setPreviewError(null);
    setPreview(null);
    setCreateSuccess(null);
    try {
      const data = await apiPost<CampaignPreview>("/api/office/notifications/campaigns", {
        mode: "preview",
        templateKey: templateId,
        channel,
        audience: segment ? "filtered" : "debtors",
        filters: {
          segment: segment || null,
          minDebt: minDebt ? Number(minDebt) : null,
        },
      });
      setPreview(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ошибка предпросмотра";
      setPreviewError(message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCreate = async () => {
    setCreateError(null);
    setCreateSuccess(null);
    const name = campaignName.trim();
    if (!name) {
      setCreateError("Укажите название кампании.");
      return;
    }
    try {
      const data = await apiPost<{ campaign: { id: string } }>("/api/office/notifications/campaigns", {
        name,
        templateKey: templateId,
        channel,
        audience: segment ? "filtered" : "debtors",
        filters: {
          segment: segment || null,
          minDebt: minDebt ? Number(minDebt) : null,
        },
      });
      setCreateSuccess(`Кампания создана (${data.campaign?.id ?? ""}).`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ошибка создания кампании";
      setCreateError(message);
    }
  };

  const defaultCampaignName = useMemo(() => {
    if (segment) return `Должники ${segment}`;
    return "Кампания должникам";
  }, [segment]);

  useEffect(() => {
    if (!campaignName) {
      setCampaignName(defaultCampaignName);
    }
  }, [campaignName, defaultCampaignName]);

  return (
    <div className="space-y-4" data-testid="office-debtors-root">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col text-sm">
            Этап
            <select
              className="mt-1 rounded-md border border-zinc-200 px-2 py-1"
              value={segment}
              onChange={(event) => setSegment(event.target.value)}
              data-testid="office-debtors-segment-filter"
            >
              {segmentOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-sm">
            Мин. долг
            <input
              className="mt-1 rounded-md border border-zinc-200 px-2 py-1"
              type="number"
              min={0}
              value={minDebt}
              onChange={(event) => setMinDebt(event.target.value)}
              placeholder="0"
            />
          </label>
          <label className="flex flex-col text-sm">
            Улица/сектор
            <input
              className="mt-1 rounded-md border border-zinc-200 px-2 py-1"
              value={street}
              onChange={(event) => setStreet(event.target.value)}
              placeholder="Берёзовая"
            />
          </label>
          <label className="flex flex-col text-sm">
            Поиск
            <input
              className="mt-1 rounded-md border border-zinc-200 px-2 py-1"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ФИО / участок"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hasPhone}
              onChange={(event) => setHasPhone(event.target.checked)}
            />
            Только с телефоном
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hasTelegram}
              onChange={(event) => setHasTelegram(event.target.checked)}
            />
            Только с Telegram
          </label>
          <button
            type="button"
            className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white"
            onClick={() => void loadDebtors()}
          >
            Применить
          </button>
          <a
            href="/api/office/billing/reports/debtors.csv"
            className="rounded-md border border-zinc-200 px-3 py-2 text-sm"
            data-testid="office-debtors-export"
          >
            Экспорт CSV
          </a>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="text-sm text-zinc-500">Найдено: {items.length}</div>
        {loading && <OfficeLoadingState message="Загрузка должников..." />}
        {error && <OfficeErrorState message={error} onRetry={loadDebtors} />}
        {!loading && !error && items.length === 0 ? (
          <OfficeEmptyState message="Должников по выбранным фильтрам нет." />
        ) : null}
        {!loading && !error && items.length > 0 ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-zinc-500">
                  <th className="py-2">Участок</th>
                  <th className="py-2">Житель</th>
                  <th className="py-2">Долг</th>
                  <th className="py-2">Просрочка</th>
                  <th className="py-2">Сегмент</th>
                  <th className="py-2">Контакты</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.residentId} className="border-b last:border-0">
                    <td className="py-2 font-medium">{row.plotLabel}</td>
                    <td className="py-2">{row.residentName}</td>
                    <td className="py-2">{row.totalDebt.toLocaleString("ru-RU")} ₽</td>
                    <td className="py-2">{row.overdueDays} дн.</td>
                    <td className="py-2">
                      {row.segment} · {row.amountBucket}
                    </td>
                    <td className="py-2 text-xs text-zinc-500">
                      {row.hasPhone ? "Телефон" : "—"}
                      {row.hasTelegram ? " · Telegram" : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">Кампании по сегменту</div>
            <div className="text-sm text-zinc-500">Создайте черновик кампании для выбранного сегмента.</div>
          </div>
        </div>

        {!canGenerateCampaign ? (
          <div className="mt-3 text-sm text-zinc-500">Нет прав на создание кампаний уведомлений.</div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <label className="flex flex-col text-sm">
                Шаблон
                <select
                  className="mt-1 rounded-md border border-zinc-200 px-2 py-1"
                  value={templateId}
                  onChange={(event) => setTemplateId(event.target.value)}
                >
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col text-sm">
                Канал
                <select
                  className="mt-1 rounded-md border border-zinc-200 px-2 py-1"
                  value={channel}
                  onChange={(event) => setChannel(event.target.value as "telegram" | "email")}
                >
                  <option value="telegram">Telegram</option>
                  <option value="email">Email</option>
                </select>
              </label>
              <label className="flex flex-col text-sm">
                Название кампании
                <input
                  className="mt-1 rounded-md border border-zinc-200 px-2 py-1"
                  value={campaignName}
                  onChange={(event) => setCampaignName(event.target.value)}
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded-md border border-zinc-200 px-3 py-2 text-sm"
                onClick={() => void handlePreview()}
                data-testid="office-debtors-generate-campaign"
              >
                Предпросмотр
              </button>
              <button
                type="button"
                className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white"
                onClick={() => void handleCreate()}
              >
                Создать кампанию
              </button>
            </div>

            {previewLoading ? <OfficeLoadingState message="Готовим предпросмотр..." /> : null}
            {previewError ? <OfficeErrorState message={previewError} /> : null}
            {createError ? <OfficeErrorState message={createError} /> : null}
            {createSuccess ? <div className="text-sm text-emerald-600">{createSuccess}</div> : null}

            {preview && (
              <div className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm">
                <div>Адресатов: {preview.targetedCount}</div>
                <div className="mt-2 text-xs text-zinc-500">Пример сообщений:</div>
                <ul className="mt-1 space-y-2">
                  {preview.sample.map((sample) => (
                    <li key={sample.plotId} className="rounded-md border border-zinc-200 bg-white p-2">
                      <div className="text-xs text-zinc-500">{sample.plotId} · {sample.residentName}</div>
                      <div className="whitespace-pre-wrap text-sm">{sample.text}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
