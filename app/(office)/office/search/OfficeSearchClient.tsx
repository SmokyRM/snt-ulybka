"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { SearchResult } from "@/server/services/search";
import { assignToMeAction } from "../appeals/actions";
import AppLink from "@/components/AppLink";
import { apiGet } from "@/lib/api/client";

type SearchResponse = {
  plots: SearchResult["plots"];
  appeals: SearchResult["appeals"];
  people?: SearchResult["people"];
};

type Props = {
  initialQuery?: string;
};

export default function OfficeSearchClient({ initialQuery = "" }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery || searchParams.get("q") || "");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<Set<string>>(new Set());

  // Синхронизация с URL
  useEffect(() => {
    const urlQuery = searchParams.get("q") || "";
    if (urlQuery !== query) {
      setQuery(urlQuery);
    }
  }, [searchParams]);

  const performSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    
    // Минимальная длина для защиты от тяжелых запросов
    if (trimmed.length < 2) {
      setResults(null);
      setLoading(false);
      // Обновляем URL
      if (trimmed.length === 0) {
        router.push("/office/search");
      }
      return;
    }

    setLoading(true);
    
    // Обновляем URL
    router.push(`/office/search?q=${encodeURIComponent(trimmed)}`);
    
    try {
      const data = await apiGet<SearchResponse>(`/api/office/search?q=${encodeURIComponent(trimmed)}&limit=10`);
      setResults(data);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // Устанавливаем таймер для debounce
    const timer = setTimeout(() => {
      performSearch(query);
    }, 400); // debounce 400ms

    // Очистка при размонтировании или изменении query
    return () => {
      clearTimeout(timer);
    };
  }, [query, performSearch]);

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      // Игнорируем ошибки копирования
    }
  };

  const handleAssignToMe = async (appealId: string) => {
    setAssigning((prev) => new Set(prev).add(appealId));
    try {
      const formData = new FormData();
      formData.append("id", appealId);
      await assignToMeAction(formData);
      // Перезагружаем результаты через небольшую задержку
      setTimeout(() => {
        performSearch(query);
      }, 500);
    } catch (error) {
      // Игнорируем ошибки
    } finally {
      setAssigning((prev) => {
        const next = new Set(prev);
        next.delete(appealId);
        return next;
      });
    }
  };

  const hasResults = results && (
    (results.people && results.people.length > 0) ||
    results.plots.length > 0 ||
    results.appeals.length > 0
  );

  return (
    <div className="space-y-4" data-testid="office-search-client">
      {/* Поисковая строка */}
      <div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по участку, телефону, обращению, имени..."
          className="w-full rounded-lg border border-zinc-200 px-4 py-3 text-base text-zinc-800 focus:border-[#5E704F] focus:outline-none"
          data-testid="office-search-input"
        />
        {loading && (
          <div className="mt-2 text-sm text-zinc-500" data-testid="office-search-loading">Поиск...</div>
        )}
        {query.trim().length > 0 && query.trim().length < 2 && (
          <div className="mt-2 text-sm text-amber-600" data-testid="office-search-min-length">
            Введите минимум 2 символа
          </div>
        )}
      </div>

      {/* Результаты */}
      {query.trim().length >= 2 && !loading && (
        <div data-testid="search-results">
          {!hasResults ? (
            <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center" data-testid="search-results-empty">
              <p className="text-sm text-zinc-600">
                Ничего не найдено по запросу &quot;{query}&quot;
              </p>
            </div>
          ) : (
            <div className="space-y-6" data-testid="search-results-groups">
              {/* Люди */}
              {results.people && results.people.length > 0 && (
                <div data-testid="search-group-people">
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-700">
                    Люди ({results.people.length})
                  </h2>
                  <div className="space-y-2">
                    {results.people.map((person) => (
                      <div
                        key={person.id}
                        className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3"
                        data-testid={`search-result-person-${person.id}`}
                      >
                        <div className="flex-1">
                          <div className="font-semibold text-zinc-900">{person.name}</div>
                          {person.phone && (
                            <div className="text-sm text-zinc-600">Телефон: {person.phone}</div>
                          )}
                          {person.email && (
                            <div className="text-sm text-zinc-500">Email: {person.email}</div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {person.phone && (
                            <button
                              onClick={() => handleCopy(person.phone!, person.id)}
                              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                              data-testid={`search-person-copy-phone-${person.id}`}
                              title="Скопировать телефон"
                            >
                              {copied === person.id ? "✓ Скопировано" : "Копировать"}
                            </button>
                          )}
                          <AppLink
                            href={person.href}
                            className="rounded-lg bg-[#5E704F] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#4d5d41]"
                            data-testid={`search-person-open-${person.id}`}
                          >
                            Открыть
                          </AppLink>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Участки */}
              {results.plots.length > 0 && (
                <div data-testid="search-group-plots">
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-700">
                    Участки ({results.plots.length})
                  </h2>
                  <div className="space-y-2">
                    {results.plots.map((plot) => (
                      <div
                        key={plot.id}
                        className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3"
                        data-testid={`search-result-plot-${plot.id}`}
                      >
                        <div className="flex-1">
                          <div className="font-semibold text-zinc-900">
                            {plot.street ? `${plot.street}, ` : ""}{plot.plotNumber}
                          </div>
                          {plot.ownerName && (
                            <div className="text-sm text-zinc-600">Владелец: {plot.ownerName}</div>
                          )}
                          {plot.phone && (
                            <div className="text-sm text-zinc-500">Телефон: {plot.phone}</div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {plot.phone && (
                            <button
                              onClick={() => handleCopy(plot.phone!, plot.id)}
                              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                              data-testid={`search-plot-copy-phone-${plot.id}`}
                              title="Скопировать телефон"
                            >
                              {copied === plot.id ? "✓" : "Копировать"}
                            </button>
                          )}
                          <AppLink
                            href={plot.href}
                            className="rounded-lg bg-[#5E704F] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#4d5d41]"
                            data-testid={`search-plot-open-${plot.id}`}
                          >
                            Открыть
                          </AppLink>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Обращения */}
              {results.appeals.length > 0 && (
                <div data-testid="search-group-appeals">
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-700">
                    Обращения ({results.appeals.length})
                  </h2>
                  <div className="space-y-2">
                    {results.appeals.map((appeal) => (
                      <div
                        key={appeal.id}
                        className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3"
                        data-testid={`search-result-appeal-${appeal.id}`}
                      >
                        <div className="flex-1">
                          <div className="font-semibold text-zinc-900">{appeal.title}</div>
                          {appeal.plotNumber && (
                            <div className="text-sm text-zinc-600">Участок: {appeal.plotNumber}</div>
                          )}
                          {appeal.authorName && (
                            <div className="text-sm text-zinc-500">Автор: {appeal.authorName}</div>
                          )}
                          <div className="mt-1 text-xs text-zinc-500">
                            Статус: {appeal.status === "new" ? "Новое" : appeal.status === "in_progress" ? "В работе" : appeal.status === "needs_info" ? "Требует уточнения" : "Закрыто"}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAssignToMe(appeal.id)}
                            disabled={assigning.has(appeal.id)}
                            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                            data-testid={`search-appeal-assign-${appeal.id}`}
                            title="Назначить на себя"
                          >
                            {assigning.has(appeal.id) ? "..." : "Назначить"}
                          </button>
                          <AppLink
                            href={appeal.href}
                            className="rounded-lg bg-[#5E704F] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#4d5d41]"
                            data-testid={`search-appeal-open-${appeal.id}`}
                          >
                            Открыть
                          </AppLink>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Пустое состояние */}
      {query.trim().length < 2 && (
        <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center" data-testid="search-empty-state">
          <p className="text-sm text-zinc-600">
            Введите минимум 2 символа для поиска по участкам, обращениям и людям.
          </p>
        </div>
      )}
    </div>
  );
}
