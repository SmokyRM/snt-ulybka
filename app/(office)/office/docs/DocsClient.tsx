"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api/client";
import type { OfficeDocumentRecord } from "@/lib/office/documentsRegistry.store";
import OfficeLoadingState from "../_components/OfficeLoadingState";
import OfficeErrorState from "../_components/OfficeErrorState";
import OfficeEmptyState from "../_components/OfficeEmptyState";

type OfficeDocument = OfficeDocumentRecord;

const typeLabels: Record<OfficeDocument["type"], string> = {
  protocol: "Протокол",
  smeta: "Смета",
  act: "Акт",
  charter: "Устав",
  monthly_report: "Ежемесячный отчёт",
  other: "Другое",
};

export default function DocsClient({ initialItems }: { initialItems: OfficeDocumentRecord[] }) {
  const [items, setItems] = useState<OfficeDocument[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [type, setType] = useState<OfficeDocument["type"]>("protocol");
  const [period, setPeriod] = useState("");
  const [tags, setTags] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [filterType, setFilterType] = useState<string>("");
  const [filterPeriod, setFilterPeriod] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [filterPublic, setFilterPublic] = useState("");
  const [workId, setWorkId] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterType) params.set("type", filterType);
      if (filterPeriod) params.set("period", filterPeriod);
      if (filterTag) params.set("tag", filterTag);
      if (filterPublic) params.set("public", filterPublic === "public" ? "true" : "false");
      const data = await apiGet<{ items: OfficeDocument[] }>(`/api/office/docs?${params.toString()}`);
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки документов");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const handleUpload = async () => {
    if (!file) {
      setError("Выберите файл");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("title", title);
      form.append("type", type);
      if (period) form.append("period", period);
      if (tags) form.append("tags", tags);
      form.append("isPublic", isPublic ? "true" : "false");
      form.append("file", file);

      await apiPost("/api/office/docs", form);

      setTitle("");
      setPeriod("");
      setTags("");
      setIsPublic(false);
      setFile(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  const linkDoc = async (docId: string, action: "link" | "unlink") => {
    if (!workId.trim()) {
      setError("Укажите ID работы");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiPost(`/api/office/works/${workId.trim()}/link-doc`, { documentId: docId, action });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка связи с работой");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="office-docs-root">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm" data-testid="office-docs-upload">
        <div className="text-sm font-semibold text-zinc-900">Загрузить документ</div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="text-sm text-zinc-700">
            Название
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-zinc-700">
            Тип
            <select
              value={type}
              onChange={(e) => setType(e.target.value as OfficeDocument["type"])}
              className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
            >
              {Object.entries(typeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-zinc-700">
            Период (YYYY-MM)
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-zinc-700">
            Теги (через запятую)
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-zinc-700">
            Файл
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            Публичный документ
          </label>
        </div>
        <div className="mt-3">
          <button
            type="button"
            onClick={handleUpload}
            className="rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white"
          >
            Загрузить
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-zinc-900">Фильтры</div>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <label className="text-sm text-zinc-700">
            Тип
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              data-testid="office-docs-filter-type"
            >
              <option value="">Все</option>
              {Object.entries(typeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-zinc-700">
            Период
            <input
              type="month"
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              data-testid="office-docs-filter-period"
            />
          </label>
          <label className="text-sm text-zinc-700">
            Тег
            <input
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              data-testid="office-docs-filter-tag"
            />
          </label>
          <label className="text-sm text-zinc-700">
            Видимость
            <select
              value={filterPublic}
              onChange={(e) => setFilterPublic(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              data-testid="office-docs-filter-visibility"
            >
              <option value="">Все</option>
              <option value="public">Публичные</option>
              <option value="private">Только внутренние</option>
            </select>
          </label>
        </div>
        <div className="mt-3">
          <button
            type="button"
            onClick={load}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700"
          >
            Применить
          </button>
        </div>
      </div>

      {loading && <OfficeLoadingState message="Загрузка..." testId="office-docs-loading" />}
      {error && <OfficeErrorState message={error} onRetry={load} testId="office-docs-error" />}

      {items.length === 0 ? (
        <OfficeEmptyState message="Документов пока нет." testId="office-docs-empty" />
      ) : (
        <div className="space-y-3" data-testid="office-docs-list">
          {items.map((doc) => (
            <div
              key={doc.id}
              className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
              data-testid={`office-docs-row-${doc.id}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-zinc-900">{doc.title}</div>
                  <div className="text-xs text-zinc-500">
                    {typeLabels[doc.type]}{doc.period ? ` · ${doc.period}` : ""}
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    doc.isPublic ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {doc.isPublic ? "Публичный" : "Внутренний"}
                </span>
              </div>
              {doc.tags.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-600">
                  {doc.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-zinc-100 px-2 py-0.5">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="mt-3 flex items-center gap-3 text-sm">
                <a href={doc.fileUrl} className="text-[#5E704F] underline" target="_blank" rel="noreferrer">
                  Открыть файл
                </a>
                <span className="text-xs text-zinc-500">{doc.fileName}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  value={workId}
                  onChange={(e) => setWorkId(e.target.value)}
                  placeholder="ID работы"
                  className="w-full rounded border border-zinc-200 px-2 py-1 text-xs sm:w-44"
                />
                <button
                  type="button"
                  onClick={() => linkDoc(doc.id, "link")}
                  className="rounded border border-zinc-200 px-2 py-1 text-xs"
                  data-testid="office-work-link-doc"
                >
                  Связать
                </button>
                <button
                  type="button"
                  onClick={() => linkDoc(doc.id, "unlink")}
                  className="rounded border border-zinc-200 px-2 py-1 text-xs text-rose-600"
                  data-testid="office-work-link-doc"
                >
                  Отвязать
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
