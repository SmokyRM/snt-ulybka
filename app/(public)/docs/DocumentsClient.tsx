"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { DocumentRecord } from "@/lib/documentsStore";

type DocumentsClientProps = {
  documents: DocumentRecord[];
  isGuest: boolean;
};

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

const audienceLabels: Record<string, string> = {
  guest: "Гости",
  user: "Жители",
  board: "Правление",
  chair: "Правление",
  admin: "Админ",
};

export default function DocumentsClient({ documents, isGuest }: DocumentsClientProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Все");
  const normalized = query.trim().toLowerCase();

  const grouped = useMemo(() => {
    const categories = Array.from(
      new Set(documents.map((doc) => doc.category || "Общее")),
    ).sort((a, b) => a.localeCompare(b));
    const byCategory = new Map<string, DocumentRecord[]>();
    const sorted = [...documents].sort((a, b) => {
      const categoryDiff = (a.category || "").localeCompare(b.category || "");
      if (categoryDiff !== 0) return categoryDiff;
      return a.title.localeCompare(b.title);
    });
    sorted.forEach((doc) => {
      const key = doc.category || "Общее";
      if (!byCategory.has(key)) byCategory.set(key, []);
      byCategory.get(key)?.push(doc);
    });
    const items = Array.from(byCategory.entries()).map(([key, items]) => ({
      key,
      label: key,
      items: items.filter((doc) => {
        if (category !== "Все" && key !== category) return false;
        if (!normalized) return true;
        const haystack = `${doc.title} ${doc.description ?? ""} ${doc.slug}`.toLowerCase();
        return haystack.includes(normalized);
      }),
    }));
    return { categories, items, sorted };
  }, [documents, normalized, category]);

  const filteredDocs = grouped.items.flatMap((group) => group.items);
  const hasAnyDocs = documents.length > 0;
  const hasFilteredDocs = filteredDocs.length > 0;
  const hasFiles = filteredDocs.some((doc) => Boolean(doc.fileUrl));
  const hasActiveFilters = normalized.length > 0 || category !== "Все";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
          <label className="text-sm font-semibold text-zinc-900">
            Поиск по документам
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Введите название или описание"
              className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-2 text-sm text-zinc-900 outline-none focus:border-[#5E704F] focus:ring-2 focus:ring-[#5E704F]/20"
            />
          </label>
          <label className="text-sm font-semibold text-zinc-900">
            Категория
            <div className="mt-2 flex items-center gap-2">
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
              >
                {["Все", ...grouped.categories].map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setCategory("Все");
                }}
                className="rounded-full border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-600 hover:border-[#5E704F] hover:text-[#5E704F]"
              >
                Сбросить
              </button>
            </div>
          </label>
        </div>
      </div>

      {!hasAnyDocs ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm">
          <div className="font-semibold text-zinc-900">Документов пока нет</div>
          <p className="mt-2 text-sm text-zinc-600">
            Если нужен документ — напишите в правление.
          </p>
          <div className="mt-3">
            <Link
              href="/contacts"
              className="inline-flex rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-[#5E704F] hover:text-[#5E704F]"
            >
              Контакты
            </Link>
          </div>
        </div>
      ) : !hasFilteredDocs && hasActiveFilters ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm">
          <div className="font-semibold text-zinc-900">Ничего не найдено</div>
          <p className="mt-2 text-sm text-zinc-600">
            Попробуйте изменить запрос или сбросить фильтры.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory("Все");
            }}
            className="mt-3 inline-flex rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-[#5E704F] hover:text-[#5E704F]"
          >
            Сбросить
          </button>
        </div>
      ) : hasFilteredDocs && !hasFiles ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm">
          <div className="font-semibold text-zinc-900">Документы готовятся</div>
          <p className="mt-2 text-sm text-zinc-600">
            Пока файлов нет, но вы можете связаться с правлением.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/contacts"
              className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-[#5E704F] hover:text-[#5E704F]"
            >
              Контакты
            </Link>
            <Link
              href={isGuest ? "/login" : "/cabinet?section=appeals"}
              className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-[#5E704F] hover:text-[#5E704F]"
            >
              Написать обращение
            </Link>
          </div>
        </div>
      ) : null}

      {hasFilteredDocs ? (
        <div className="space-y-6">
          {grouped.items.map((group) => (
          <div key={group.key} className="space-y-3">
            <h2 className="text-lg font-semibold text-zinc-900">{group.label}</h2>
            {group.items.length === 0 ? (
              <div className="text-sm text-zinc-500">Документы появятся в этом разделе позже.</div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {group.items.map((doc) => (
                  <div key={doc.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-zinc-900">{doc.title}</div>
                        <div className="mt-1 text-xs text-zinc-500">{doc.category}</div>
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {doc.audience.map((item) => audienceLabels[item] ?? item).join(", ")}
                      </div>
                    </div>
                    {doc.description ? (
                      <p className="mt-2 text-sm text-zinc-700">{doc.description}</p>
                    ) : null}
                    {doc.fileUrl && (
                      <div className="mt-2 text-xs text-zinc-500">
                        {formatFileMeta(doc.mime, doc.size)}
                      </div>
                    )}
                    {doc.fileUrl ? (
                      <a
                        href={doc.fileUrl}
                        className="mt-3 inline-flex text-sm font-semibold text-[#5E704F] underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Открыть
                      </a>
                    ) : (
                      <div className="mt-3 space-y-2 text-xs text-zinc-600">
                        <div>Документ готовится.</div>
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href="/contacts"
                            className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-[#5E704F] hover:text-[#5E704F]"
                          >
                            Контакты
                          </Link>
                          <Link
                            href={isGuest ? "/login" : "/cabinet?section=appeals"}
                            className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-[#5E704F] hover:text-[#5E704F]"
                          >
                            Написать обращение
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
