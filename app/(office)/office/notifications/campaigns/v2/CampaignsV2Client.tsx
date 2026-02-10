"use client";

import { useState, useTransition } from "react";
import { apiPost, apiGet, ApiError } from "@/lib/api/client";

interface Template {
  id: string;
  name: string;
  channel: string;
}

interface Campaign {
  id: string;
  name: string;
  channel: string;
  templateId: string | null;
  status: string;
  createdAt: string;
  stats: { targeted: number; sent: number; failed: number };
}

interface DryRunResult {
  count: number;
  noContact: number;
  sample: Array<{
    fullName: string;
    plotLabel: string;
    contactMasked: string;
    debtAmount: number;
    preview: string;
  }>;
  problems: string[];
}

interface Props {
  initialCampaigns: Campaign[];
  templates: Template[];
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Черновик",
  dry_run: "Dry-run",
  scheduled: "Запланирована",
  sending: "Отправка",
  done: "Завершена",
  failed: "Ошибка",
  cancelled: "Отменена",
};

export default function CampaignsV2Client({ initialCampaigns, templates }: Props) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("telegram");
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [minDebt, setMinDebt] = useState("0");
  const [street, setStreet] = useState("");
  const [dryRun, setDryRun] = useState<DryRunResult | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Array<{ recipientMasked: string; status: string; error: string | null }>>([]);
  const [error, setError] = useState<string | null>(null);

  const doDryRun = () => {
    startTransition(async () => {
      setError(null);
      setDryRun(null);
      try {
        const data = await apiPost<DryRunResult>(
          "/api/office/notifications/campaigns/v2/dry-run",
          { templateId, channel, segment: { minDebt: Number(minDebt) || 0, street: street || undefined } },
        );
        setDryRun(data);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Сетевая ошибка");
      }
    });
  };

  const doCreate = () => {
    startTransition(async () => {
      setError(null);
      try {
        const data = await apiPost<{ campaign: Campaign }>(
          "/api/office/notifications/campaigns/v2",
          { name, channel, templateId, segment: { minDebt: Number(minDebt) || 0, street: street || undefined } },
        );
        setCampaigns((prev) => [data.campaign, ...prev]);
        setShowForm(false);
        setName("");
        setDryRun(null);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Сетевая ошибка");
      }
    });
  };

  const doSend = (campaignId: string) => {
    startTransition(async () => {
      setError(null);
      try {
        const data = await apiPost<{ campaign: Campaign }>(
          `/api/office/notifications/campaigns/v2/${campaignId}/send`,
        );
        setCampaigns((prev) =>
          prev.map((c) => (c.id === campaignId ? { ...c, ...data.campaign } : c)),
        );
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Сетевая ошибка");
      }
    });
  };

  const loadDeliveries = (campaignId: string) => {
    startTransition(async () => {
      setSelectedCampaign(campaignId);
      try {
        const data = await apiGet<{ deliveries: Array<{ recipientMasked: string; status: string; error: string | null }> }>(
          `/api/office/notifications/campaigns/v2/${campaignId}/deliveries`,
        );
        setDeliveries(data.deliveries ?? []);
      } catch {
        setDeliveries([]);
      }
    });
  };

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowForm(!showForm)}
        className="rounded-full bg-[#5E704F] px-5 py-2 text-sm font-semibold text-white hover:bg-[#4d5d40]"
      >
        {showForm ? "Закрыть" : "Создать кампанию"}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {showForm && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">Новая кампания</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Название</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Канал</label>
              <select value={channel} onChange={(e) => setChannel(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm">
                <option value="telegram">Telegram</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Шаблон</label>
              <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm">
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.channel})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Мин. долг (руб.)</label>
              <input type="number" value={minDebt} onChange={(e) => setMinDebt(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Улица (фильтр)</label>
              <input value={street} onChange={(e) => setStreet(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="не обязательно" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={doDryRun} disabled={isPending || !templateId} className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-[#5E704F] disabled:opacity-50">
              Dry-run
            </button>
            <button onClick={doCreate} disabled={isPending || !name.trim() || !templateId} className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4d5d40] disabled:opacity-50">
              Создать
            </button>
          </div>

          {dryRun && (
            <div className="rounded-lg bg-zinc-50 p-4 space-y-2">
              <p className="text-sm font-semibold">Получателей: {dryRun.count} (без контакта: {dryRun.noContact})</p>
              {dryRun.problems.length > 0 && (
                <div className="text-sm text-amber-700">
                  {dryRun.problems.map((p, i) => <p key={i}>{p}</p>)}
                </div>
              )}
              {dryRun.sample.length > 0 && (
                <table className="w-full text-xs">
                  <thead><tr className="border-b text-left"><th className="py-1">Имя</th><th>Участок</th><th>Контакт</th><th>Долг</th><th>Превью</th></tr></thead>
                  <tbody>
                    {dryRun.sample.map((s, i) => (
                      <tr key={i} className="border-b"><td className="py-1">{s.fullName}</td><td>{s.plotLabel}</td><td>{s.contactMasked}</td><td>{s.debtAmount}</td><td className="max-w-[200px] truncate">{s.preview}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {campaigns.length === 0 ? (
          <p className="text-sm text-zinc-500">Кампании пока не созданы</p>
        ) : (
          campaigns.map((c) => (
            <div key={c.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-zinc-900">{c.name}</h3>
                  <div className="mt-1 flex gap-2 text-xs">
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-600">{c.channel}</span>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-600">{STATUS_LABELS[c.status] ?? c.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    Целевых: {c.stats.targeted} | Отправлено: {c.stats.sent} | Ошибок: {c.stats.failed}
                  </p>
                </div>
                <div className="flex gap-2">
                  {(c.status === "draft" || c.status === "dry_run") && (
                    <button
                      onClick={() => doSend(c.id)}
                      disabled={isPending}
                      className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Отправить
                    </button>
                  )}
                  <button
                    onClick={() => loadDeliveries(c.id)}
                    className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-[#5E704F]"
                  >
                    Доставки
                  </button>
                </div>
              </div>

              {selectedCampaign === c.id && deliveries.length > 0 && (
                <div className="mt-3 border-t pt-3">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b text-left"><th className="py-1">Получатель</th><th>Статус</th><th>Ошибка</th></tr></thead>
                    <tbody>
                      {deliveries.map((d, i) => (
                        <tr key={i} className="border-b">
                          <td className="py-1">{d.recipientMasked}</td>
                          <td><span className={`rounded-full px-2 py-0.5 text-xs ${d.status === "sent" ? "bg-emerald-50 text-emerald-700" : d.status === "failed" ? "bg-red-50 text-red-700" : "bg-zinc-100 text-zinc-600"}`}>{d.status}</span></td>
                          <td className="text-zinc-500">{d.error ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
