"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Template } from "@/lib/templates";

type Props = {
  templates: Template[];
  categories: string[];
};

export default function TemplatesIndex({ templates, categories }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Все");

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return templates.filter((item) => {
      const matchCat = category === "Все" || item.category === category;
      if (!matchCat) return false;
      if (!trimmed) return true;
      const haystack = `${item.title} ${item.summary} ${item.tags.join(" ")}`.toLowerCase();
      return haystack.includes(trimmed);
    });
  }, [templates, category, query]);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
        <label className="block text-sm text-zinc-700">
          Поиск
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Например: справка, обращение"
            className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm text-zinc-700">
          Категория
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
          >
            {["Все", ...categories].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
          Ничего не найдено. Попробуйте другой запрос или снимите фильтр.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((item) => (
            <Link
              key={item.slug}
              href={`/templates/${item.slug}`}
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-[#5E704F]/40 hover:shadow-md"
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-[#5E704F]">
                {item.category}
              </div>
              <h3 className="mt-2 text-lg font-semibold text-zinc-900">{item.title}</h3>
              <p className="mt-1 text-sm text-zinc-600">{item.summary}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-zinc-500">
                {item.tags.map((tag) => (
                  <span
                    key={`${item.slug}-${tag}`}
                    className="rounded-full border border-zinc-200 px-2 py-0.5"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
