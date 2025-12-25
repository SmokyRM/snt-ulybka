"use client";

import { useMemo, useState } from "react";
import { ELECTRICITY_FAQ } from "@/content/electricity";

const match = (value: string, term: string) =>
  value.toLowerCase().includes(term.toLowerCase());

export default function FaqSearch() {
  const [term, setTerm] = useState("");

  const filtered = useMemo(() => {
    const query = term.trim().toLowerCase();
    if (!query) return ELECTRICITY_FAQ;
    return ELECTRICITY_FAQ.filter((item) => {
      if (match(item.q, query) || match(item.a, query)) return true;
      if (item.tags) {
        return item.tags.some((tag) => match(tag, query));
      }
      return false;
    });
  }, [term]);

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold text-zinc-900">FAQ</h3>
        <input
          type="text"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Поиск по вопросам"
          className="w-full rounded-2xl border border-zinc-200 px-4 py-2 text-sm outline-none transition-shadow focus:border-[#5E704F] focus:ring-2 focus:ring-[#5E704F]/30 sm:max-w-xs"
        />
      </div>
      <div className="mt-4 space-y-3">
        {filtered.map((item, idx) => (
          <details
            key={item.q}
            className="group rounded-2xl border border-zinc-200 bg-white p-4 transition-colors"
            open={idx === 0 && !term}
          >
            <summary className="cursor-pointer text-sm font-semibold text-zinc-900">
              {item.q}
            </summary>
            <p className="mt-2 text-sm leading-6 text-zinc-700">{item.a}</p>
            {item.tags && (
              <div className="mt-2 flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[#5E704F]/10 px-3 py-1 text-xs font-semibold text-[#5E704F]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </details>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-zinc-600">Ничего не найдено.</p>
        )}
      </div>
    </div>
  );
}
