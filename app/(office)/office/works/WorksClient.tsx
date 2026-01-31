"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api/client";
import OfficeLoadingState from "../_components/OfficeLoadingState";
import OfficeErrorState from "../_components/OfficeErrorState";
import OfficeEmptyState from "../_components/OfficeEmptyState";

type WorkRecord = {
  id: string;
  title: string;
  description: string;
  location: string;
  plotId: string | null;
  contractorName: string | null;
  cost: number;
  currency: "RUB";
  status: "planned" | "in_progress" | "done";
  startedAt: string | null;
  finishedAt: string | null;
  photoBeforeUrls: string[];
  photoAfterUrls: string[];
  linkedAppealIds: string[];
  linkedDocumentIds: string[];
  createdAt: string;
  createdBy: string | null;
};

const statusLabels: Record<WorkRecord["status"], string> = {
  planned: "План",
  in_progress: "В работе",
  done: "Завершено",
};

export default function WorksClient({ initialItems, canEdit }: { initialItems: WorkRecord[]; canEdit: boolean }) {
  const [items, setItems] = useState<WorkRecord[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [period, setPeriod] = useState("");
  const [location, setLocation] = useState("");
  const [contractor, setContractor] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [workLocation, setWorkLocation] = useState("");
  const [plotId, setPlotId] = useState("");
  const [contractorName, setContractorName] = useState("");
  const [cost, setCost] = useState(0);
  const [statusValue, setStatusValue] = useState<WorkRecord["status"]>("planned");
  const [startedAt, setStartedAt] = useState("");
  const [finishedAt, setFinishedAt] = useState("");
  const [beforeUrls, setBeforeUrls] = useState("");
  const [afterUrls, setAfterUrls] = useState("");

  const [selected, setSelected] = useState<WorkRecord | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (period) params.set("period", period);
      if (location) params.set("location", location);
      if (contractor) params.set("contractor", contractor);
      const data = await apiGet<{ items: WorkRecord[] }>(`/api/office/works?${params.toString()}`);
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiPost("/api/office/works", {
        title,
        description,
        location: workLocation,
        plotId: plotId || null,
        contractorName: contractorName || null,
        cost,
        status: statusValue,
        startedAt: startedAt || null,
        finishedAt: finishedAt || null,
        photoBeforeUrls: beforeUrls.split(",").map((v) => v.trim()).filter(Boolean),
        photoAfterUrls: afterUrls.split(",").map((v) => v.trim()).filter(Boolean),
      });
      setTitle("");
      setDescription("");
      setWorkLocation("");
      setPlotId("");
      setContractorName("");
      setCost(0);
      setStatusValue("planned");
      setStartedAt("");
      setFinishedAt("");
      setBeforeUrls("");
      setAfterUrls("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка создания");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="office-works-root">
      {canEdit && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm" data-testid="office-works-create">
        <div className="text-sm font-semibold text-zinc-900">Новая работа</div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="text-sm text-zinc-700">
            Название
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm text-zinc-700">
            Место
            <input value={workLocation} onChange={(e) => setWorkLocation(e.target.value)} className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm text-zinc-700">
            Статус
            <select value={statusValue} onChange={(e) => setStatusValue(e.target.value as WorkRecord["status"])} className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm">
              <option value="planned">План</option>
              <option value="in_progress">В работе</option>
              <option value="done">Завершено</option>
            </select>
          </label>
          <label className="text-sm text-zinc-700">
            Стоимость
            <input type="number" value={cost} onChange={(e) => setCost(Number(e.target.value))} className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm text-zinc-700">
            Участок (plotId)
            <input value={plotId} onChange={(e) => setPlotId(e.target.value)} className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm text-zinc-700">
            Подрядчик
            <input value={contractorName} onChange={(e) => setContractorName(e.target.value)} className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm text-zinc-700">
            Начало
            <input type="date" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm text-zinc-700">
            Завершение
            <input type="date" value={finishedAt} onChange={(e) => setFinishedAt(e.target.value)} className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm text-zinc-700 md:col-span-2">
            Описание
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm" rows={3} />
          </label>
          <label className="text-sm text-zinc-700">
            Фото до (URL через запятую)
            <input value={beforeUrls} onChange={(e) => setBeforeUrls(e.target.value)} className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm text-zinc-700">
            Фото после (URL через запятую)
            <input value={afterUrls} onChange={(e) => setAfterUrls(e.target.value)} className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm" />
          </label>
        </div>
        <div className="mt-3">
          <button type="button" onClick={handleCreate} className="rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white">Создать</button>
        </div>
        </div>
      )}

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-zinc-900">Фильтры</div>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <label className="text-sm text-zinc-700">
            Статус
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm">
              <option value="">Все</option>
              <option value="planned">План</option>
              <option value="in_progress">В работе</option>
              <option value="done">Завершено</option>
            </select>
          </label>
          <label className="text-sm text-zinc-700">
            Период
            <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm text-zinc-700">
            Локация
            <input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm text-zinc-700">
            Подрядчик
            <input value={contractor} onChange={(e) => setContractor(e.target.value)} className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm" />
          </label>
        </div>
        <div className="mt-3">
          <button type="button" onClick={load} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700">Применить</button>
        </div>
      </div>

      {loading && <OfficeLoadingState message="Загрузка..." />}
      {error && <OfficeErrorState message={error} onRetry={load} />}

      {!loading && items.length === 0 ? (
        <OfficeEmptyState message="Работ пока нет." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-3">
            {items.map((work) => (
              <button
                key={work.id}
                type="button"
                onClick={() => setSelected(work)}
                className="w-full rounded-2xl border border-zinc-200 bg-white p-4 text-left shadow-sm"
                data-testid={`office-works-row-${work.id}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-zinc-900">{work.title}</div>
                    <div className="text-xs text-zinc-500">{work.location}</div>
                  </div>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                    {statusLabels[work.status]}
                  </span>
                </div>
                <div className="mt-2 text-xs text-zinc-500">{new Date(work.createdAt).toLocaleDateString("ru-RU")}</div>
              </button>
            ))}
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            {selected ? (
              <div className="space-y-2">
                <div className="text-sm font-semibold text-zinc-900">{selected.title}</div>
                <div className="text-xs text-zinc-500">{selected.location}</div>
                <div className="text-sm text-zinc-700">{selected.description}</div>
                <div className="text-xs text-zinc-500">Статус: {statusLabels[selected.status]}</div>
                <div className="text-xs text-zinc-500">Стоимость: {selected.cost} ₽</div>
                <div className="text-xs text-zinc-500">Подрядчик: {selected.contractorName ?? "—"}</div>
                {selected.linkedAppealIds.length > 0 && (
                  <div className="text-xs text-zinc-500">Обращения: {selected.linkedAppealIds.join(", ")}</div>
                )}
                {selected.linkedDocumentIds.length > 0 && (
                  <div className="text-xs text-zinc-500">Документы: {selected.linkedDocumentIds.join(", ")}</div>
                )}
              </div>
            ) : (
              <div className="text-sm text-zinc-600">Выберите работу для просмотра.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
