"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@/lib/permissions";
import { apiGet } from "@/lib/api/client";

type SearchPerson = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  href: string;
};

type SearchPlot = {
  id: string;
  plotNumber: string;
  street?: string;
  ownerName?: string | null;
  href: string;
};

type SearchFinance = {
  id: string;
  plotNumber: string;
  residentName: string;
  debt: number;
  href: string;
};

type SearchResult = {
  plots: SearchPlot[];
  appeals: Array<{ id: string; title: string; href: string }>;
  people?: SearchPerson[];
  finance?: SearchFinance[];
};

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

type Props = {
  role: Role;
};

export default function OfficeSearch({ role }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const data = await apiGet<SearchResult>(`/api/office/search?q=${encodeURIComponent(q)}&limit=10`);
      setResults(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length >= 2) {
      debounceRef.current = setTimeout(() => search(query), 300);
    } else {
      setResults(null);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const navigate = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  const hasResults =
    results &&
    (results.plots.length > 0 ||
      results.appeals.length > 0 ||
      (results.people?.length ?? 0) > 0 ||
      (results.finance?.length ?? 0) > 0);

  const showDropdown = open && query.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Поиск (Ctrl+/)"
          className="w-48 rounded-lg border border-zinc-200 bg-zinc-50 py-1.5 pl-9 pr-3 text-sm text-zinc-800 placeholder-zinc-400 outline-none transition focus:border-[#5E704F] focus:bg-white sm:w-64"
          data-testid="office-search-input"
        />
        {loading && (
          <SpinnerIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        )}
      </div>

      {showDropdown && (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-80 rounded-xl border border-zinc-200 bg-white shadow-lg sm:w-96"
          data-testid="office-search-dropdown"
        >
          {!hasResults && !loading && (
            <div className="px-4 py-3 text-sm text-zinc-500">Ничего не найдено</div>
          )}

          {results?.people && results.people.length > 0 && (
            <div className="border-b border-zinc-100">
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Люди
              </div>
              {results.people.slice(0, 5).map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => navigate(person.href)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-50"
                >
                  <span className="font-medium text-zinc-900">{person.name}</span>
                  {person.phone && <span className="text-zinc-500">{person.phone}</span>}
                </button>
              ))}
            </div>
          )}

          {results?.plots && results.plots.length > 0 && (
            <div className="border-b border-zinc-100">
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Участки
              </div>
              {results.plots.slice(0, 5).map((plot) => (
                <button
                  key={plot.id}
                  type="button"
                  onClick={() => navigate(plot.href)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-50"
                >
                  <span className="font-medium text-zinc-900">№{plot.plotNumber}</span>
                  {plot.street && <span className="text-zinc-500">{plot.street}</span>}
                  {plot.ownerName && <span className="text-zinc-400">— {plot.ownerName}</span>}
                </button>
              ))}
            </div>
          )}

          {results?.finance && results.finance.length > 0 && (
            <div className="border-b border-zinc-100">
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Платежи
              </div>
              {results.finance.slice(0, 5).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.href)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-zinc-50"
                >
                  <span>
                    <span className="font-medium text-zinc-900">{item.residentName}</span>
                    <span className="ml-2 text-zinc-500">{item.plotNumber}</span>
                  </span>
                  <span className="text-zinc-700">{item.debt.toLocaleString("ru-RU")} ₽</span>
                </button>
              ))}
            </div>
          )}

          {results?.appeals && results.appeals.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Обращения
              </div>
              {results.appeals.slice(0, 3).map((appeal) => (
                <button
                  key={appeal.id}
                  type="button"
                  onClick={() => navigate(appeal.href)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-50"
                >
                  <span className="font-medium text-zinc-900">{appeal.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
