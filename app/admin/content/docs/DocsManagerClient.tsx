"use client";

import { useMemo, useState } from "react";
import type { DocumentAudience, DocumentRecord } from "@/lib/documentsStore";
import { readOk } from "@/lib/api/client";

type Props = {
  initialDocs: DocumentRecord[];
};

type Draft = {
  id: string | null;
  slug: string;
  title: string;
  category: string;
  published: boolean;
  audience: DocumentAudience[];
  fileUrl: string | null;
  mime: string | null;
  size: number | null;
};

const AUDIENCE_OPTIONS: Array<{ value: DocumentAudience; label: string }> = [
  { value: "guest", label: "Гость" },
  { value: "user", label: "Житель" },
  { value: "board", label: "Правление" },
  { value: "chair", label: "Председатель" },
  { value: "admin", label: "Админ" },
];

const formatFileMeta = (mime: string | null, size: number | null) => {
  if (!mime || !size) return "";
  const label =
    mime === "application/pdf"
      ? "PDF"
      : mime === "image/png"
        ? "PNG"
        : mime === "image/jpeg"
          ? "JPG"
          : mime === "image/webp"
            ? "WEBP"
            : mime.toUpperCase();
  const kb = Math.round(size / 102.4) / 10;
  const value = kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(1)} KB`;
  return `${label} • ${value}`;
};

const emptyDraft = (): Draft => ({
  id: null,
  slug: "",
  title: "",
  category: "Общее",
  published: false,
  audience: ["guest"],
  fileUrl: null,
  mime: null,
  size: null,
});

export default function DocsManagerClient({ initialDocs }: Props) {
  const [docs, setDocs] = useState<DocumentRecord[]>(initialDocs);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const audienceLabel = useMemo(() => {
    if (draft.audience.length === AUDIENCE_OPTIONS.length) return "Все";
    return draft.audience
      .map((item) => AUDIENCE_OPTIONS.find((opt) => opt.value === item)?.label || item)
      .join(", ");
  }, [draft.audience]);

  const resetDraft = () => setDraft(emptyDraft());

  const handleEdit = (doc: DocumentRecord) => {
    setDraft({
      id: doc.id,
      slug: doc.slug ?? "",
      title: doc.title,
      category: doc.category,
      published: doc.published,
      audience: doc.audience,
      fileUrl: doc.fileUrl,
      mime: doc.mime ?? null,
      size: doc.size ?? null,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить документ?")) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/content/docs/${id}`, { method: "DELETE" });
      await readOk<{ ok: true }>(res);
      setDocs((prev) => prev.filter((item) => item.id !== id));
      if (draft.id === id) resetDraft();
      setMessage("Документ удалён.");
    } catch {
      setMessage("Не удалось удалить документ.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!draft.title.trim()) {
      setMessage("Название документа обязательно.");
      return;
    }
    setLoading(true);
    setMessage(null);
    const payload = {
      slug: draft.slug.trim(),
      title: draft.title.trim(),
      category: draft.category.trim() || "Общее",
      published: draft.published,
      audience: draft.audience,
      fileUrl: draft.fileUrl,
      mime: draft.mime,
      size: draft.size,
    };
    try {
      const res = await fetch(
        draft.id ? `/api/admin/content/docs/${draft.id}` : "/api/admin/content/docs",
        {
          method: draft.id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = await readOk<{ document: DocumentRecord }>(res);
      setDocs((prev) => {
        if (draft.id) {
          return prev.map((item) => (item.id === json.document.id ? json.document : item));
        }
        return [json.document, ...prev];
      });
      setDraft((prev) => ({ ...prev, id: json.document.id }));
      setMessage("Сохранено.");
    } catch {
      setMessage("Не удалось сохранить документ.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setMessage(null);
    const body = new FormData();
    body.append("file", file);
    try {
      const res = await fetch("/api/admin/content/docs/upload", { method: "POST", body });
      const json = await readOk<{ url: string; mime: string; size: number }>(res);
      setDraft((prev) => ({ ...prev, fileUrl: json.url, mime: json.mime, size: json.size }));
      setMessage("Файл загружен.");
    } catch {
      setMessage("Не удалось загрузить файл.");
    } finally {
      setUploading(false);
    }
  };

  const toggleAudience = (value: DocumentAudience) => {
    setDraft((prev) => {
      const exists = prev.audience.includes(value);
      const next = exists ? prev.audience.filter((item) => item !== value) : [...prev.audience, value];
      return { ...prev, audience: next.length === 0 ? ["guest"] : next };
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-zinc-900">Документы</h2>
          <span className="text-xs text-zinc-500">Всего: {docs.length}</span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-zinc-700">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
                <th className="py-2 pr-3">Документ</th>
                <th className="py-2 pr-3">Категория</th>
                <th className="py-2 pr-3">Публикация</th>
                <th className="py-2 pr-3">Аудитория</th>
                <th className="py-2 pr-3">Файл</th>
                <th className="py-2 pr-3">Действия</th>
              </tr>
            </thead>
            <tbody>
              {docs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-sm text-zinc-500">
                    Документов пока нет.
                  </td>
                </tr>
              ) : (
                docs.map((doc) => (
                  <tr key={doc.id} className="border-b border-zinc-100">
                    <td className="py-3 pr-3 font-semibold text-zinc-900">{doc.title}</td>
                    <td className="py-3 pr-3">{doc.category}</td>
                    <td className="py-3 pr-3">{doc.published ? "Да" : "Нет"}</td>
                    <td className="py-3 pr-3 text-xs text-zinc-600">
                      {doc.audience.join(", ")}
                    </td>
                    <td className="py-3 pr-3 text-xs text-zinc-600">
                      {doc.fileUrl ? (
                        <span>
                          Файл
                          {doc.mime && doc.size ? ` • ${formatFileMeta(doc.mime, doc.size)}` : ""}
                        </span>
                      ) : (
                        "Нет"
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(doc)}
                          className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-[#5E704F] hover:text-[#5E704F]"
                        >
                          Редактировать
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(doc.id)}
                          className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 hover:border-rose-300"
                        >
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">
            {draft.id ? "Редактирование" : "Новый документ"}
          </h2>
          {draft.id && (
            <button
              type="button"
              onClick={resetDraft}
              className="text-xs font-semibold text-[#5E704F] underline"
            >
              Сбросить
            </button>
          )}
        </div>

        <div className="mt-4 space-y-3 text-sm text-zinc-700">
          <label className="block">
            Слаг
            <input
              value={draft.slug}
              onChange={(event) => setDraft((prev) => ({ ...prev, slug: event.target.value }))}
              placeholder="например, bank-details"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            Название
            <input
              value={draft.title}
              onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            Категория
            <input
              value={draft.category}
              onChange={(event) => setDraft((prev) => ({ ...prev, category: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={draft.published}
              onChange={(event) => setDraft((prev) => ({ ...prev, published: event.target.checked }))}
            />
            Опубликован
          </label>
          <div>
            <div className="text-sm font-semibold text-zinc-900">Аудитория</div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-600">
              {AUDIENCE_OPTIONS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => toggleAudience(item.value)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    draft.audience.includes(item.value)
                      ? "border-[#5E704F] text-[#5E704F]"
                      : "border-zinc-200 text-zinc-600 hover:border-[#5E704F] hover:text-[#5E704F]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="mt-1 text-xs text-zinc-500">Выбрано: {audienceLabel}</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-900">Файл</div>
            <div className="mt-1 text-xs text-zinc-600">
              {draft.fileUrl ? "Файл привязан" : "Файл не загружен"}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleUpload(file);
                }}
              />
              {uploading && <span className="text-xs text-zinc-500">Загрузка...</span>}
            </div>
          </div>
          {message && <div className="text-xs text-zinc-600">{message}</div>}
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="w-full rounded-full bg-[#5E704F] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#4d5d41] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Сохраняем..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}
