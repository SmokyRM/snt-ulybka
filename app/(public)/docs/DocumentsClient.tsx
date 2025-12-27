"use client";

import { useMemo, useState } from "react";
import type { PublicDocumentCategory } from "@/lib/publicContentDefaults";

type DocumentsClientProps = {
  categories: PublicDocumentCategory[];
};

export default function DocumentsClient({ categories }: DocumentsClientProps) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();

  const grouped = useMemo(() => {
    return categories.map((category) => ({
      ...category,
      items: category.documents.filter((doc) => {
        if (!normalized) return true;
        const haystack = `${doc.title} ${doc.description}`.toLowerCase();
        return haystack.includes(normalized);
      }),
    }));
  }, [categories, normalized]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <label className="text-sm font-semibold text-zinc-900">Поиск по документам</label>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Введите название или описание"
          className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-2 text-sm text-zinc-900 outline-none focus:border-[#5E704F] focus:ring-2 focus:ring-[#5E704F]/20"
        />
      </div>

      {grouped.every((group) => group.items.length === 0) ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm">
          По вашему запросу ничего не найдено.
        </div>
      ) : null}

      <div className="space-y-6">
        {grouped.map((group) => (
          <div key={group.key} className="space-y-3">
            <h2 className="text-lg font-semibold text-zinc-900">{group.label}</h2>
            {group.items.length === 0 ? (
              <div className="text-sm text-zinc-500">Документы появятся в этом разделе позже.</div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {group.items.map((doc) => (
                  <div key={doc.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                    <div className="text-sm font-semibold text-zinc-900">{doc.title}</div>
                    <div className="mt-1 text-xs text-zinc-500">{doc.date}</div>
                    <p className="mt-2 text-sm text-zinc-700">{doc.description}</p>
                    <a
                      href={doc.downloadUrl}
                      className="mt-3 inline-flex text-sm font-semibold text-[#5E704F] underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Скачать документ
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
