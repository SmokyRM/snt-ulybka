"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { RegistryPerson } from "@/types/snt";
import { apiPost, apiGet } from "@/lib/api/client";

function OfficeVerifyButton({ personId }: { personId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!confirm("Подтвердить этого человека?")) return;
    setLoading(true);
    setError(null);

    try {
      await apiPost<{ person: RegistryPerson }>(`/api/office/registry/persons/${personId}/verify`);

      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка подтверждения");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      {error && (
        <div className="text-xs text-red-600">{error}</div>
      )}
      <button
        type="button"
        onClick={handleVerify}
        disabled={loading}
        className="rounded border border-green-300 px-2 py-1 text-xs text-green-700 hover:bg-green-50 disabled:opacity-50"
      >
        {loading ? "..." : "Подтвердить"}
      </button>
    </div>
  );
}

interface EnrichedPerson extends RegistryPerson {
  plotsData: Array<{
    id: string;
    plotNumber: string;
    sntStreetNumber: string;
    cityAddress?: string | null;
  }>;
}

interface OfficeRegistryClientProps {
  initialPersons: EnrichedPerson[];
  initialQuery?: string;
  initialStatus: "all" | "verified" | "pending" | "rejected" | "not_verified";
  initialPage: number;
  initialTotal: number;
  limit: number;
}

export default function OfficeRegistryClient({
  initialPersons,
  initialQuery = "",
  initialStatus,
  initialPage,
  initialTotal,
  limit,
}: OfficeRegistryClientProps) {
  const router = useRouter();
  const [persons, setPersons] = useState<EnrichedPerson[]>(initialPersons);
  const [query, setQuery] = useState(initialQuery);
  const [statusFilter, setStatusFilter] = useState<"all" | "verified" | "pending" | "rejected" | "not_verified">(
    initialStatus,
  );
  const [page, setPage] = useState(initialPage);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateUrl = (nextPage: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (statusFilter && statusFilter !== "all") params.set("verificationStatus", statusFilter);
    params.set("page", String(nextPage));
    params.set("limit", String(limit));
    router.replace(`/office/registry?${params.toString()}`);
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPage(1);
      loadPersons(1);
    }, 400);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, statusFilter]);

  useEffect(() => {
    if (page === initialPage) return;
    loadPersons(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const loadPersons = async (nextPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (statusFilter && statusFilter !== "all") params.set("verificationStatus", statusFilter);
      params.set("page", String(nextPage));
      params.set("limit", String(limit));

      const data = await apiGet<{ persons?: EnrichedPerson[]; total?: number; page?: number }>(
        `/api/admin/registry?${params.toString()}`,
      );
      setPersons(data?.persons || []);
      setTotal(data?.total ?? 0);
      const pageValue = data?.page ?? nextPage;
      setPage(pageValue);
      updateUrl(pageValue);
    } catch (e) {
      setError((e as Error).message || "Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.min(page, totalPages);

  return (
    <div className="space-y-6" data-testid="office-registry-root">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Реестр СНТ</h1>
          <p className="mt-1 text-sm text-zinc-600">Просмотр данных участков и владельцев</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3" role="alert" data-testid="office-error-state">
          <p className="text-sm text-red-900">{error}</p>
          <button
            type="button"
            onClick={() => loadPersons(page)}
            className="mt-2 rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50"
            data-testid="office-retry-button"
          >
            Повторить
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск: ФИО, телефон, email"
            className="w-full max-w-md rounded border border-zinc-300 px-3 py-2 text-sm"
            data-testid="office-registry-search"
          />
          <div className="flex flex-wrap gap-2 text-xs">
            {[
              { key: "all", label: "Все" },
              { key: "not_verified", label: "Не проверены" },
              { key: "verified", label: "Подтверждены" },
              { key: "pending", label: "На проверке" },
              { key: "rejected", label: "Отклонены" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setStatusFilter(item.key as typeof statusFilter)}
                className={`rounded-full border px-3 py-1 font-semibold ${
                  statusFilter === item.key ? "border-[#5E704F] bg-[#5E704F]/10 text-[#5E704F]" : "border-zinc-200 text-zinc-600"
                }`}
                data-testid={`office-registry-filter-${item.key}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-zinc-600" data-testid="office-loading-state">
          <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-zinc-200 border-t-[#5E704F]" />
          Загрузка...
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700">ФИО</th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700">Телефон</th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700">Участки</th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700">Статус</th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {persons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-500" data-testid="office-empty-state">
                    <p>Реестр пуст</p>
                    {(query || statusFilter !== "all") && (
                      <button
                        type="button"
                        onClick={() => { setQuery(""); setStatusFilter("all"); }}
                        className="mt-2 rounded-lg border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700 transition hover:border-[#5E704F]"
                        data-testid="office-reset-filters"
                      >
                        Сбросить фильтры
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                persons.map((person) => (
                  <tr key={person.id} className="hover:bg-zinc-50" data-testid="office-registry-row">
                    <td className="px-4 py-3 font-medium text-zinc-900">{person.fullName}</td>
                    <td className="px-4 py-3 text-zinc-700">{person.phone || "—"}</td>
                    <td className="px-4 py-3 text-zinc-700">{person.email || "—"}</td>
                    <td className="px-4 py-3 text-zinc-700">
                      <div className="flex flex-wrap gap-1">
                        {person.plotsData.map((plot) => (
                          <span key={plot.id} className="rounded bg-zinc-100 px-2 py-0.5 text-xs">
                            Линия {plot.sntStreetNumber}, участок {plot.plotNumber}
                          </span>
                        ))}
                        {person.plotsData.length === 0 && <span className="text-zinc-400">Нет участков</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                          person.verificationStatus === "verified"
                            ? "bg-green-100 text-green-800"
                            : person.verificationStatus === "rejected"
                              ? "bg-red-100 text-red-800"
                              : person.verificationStatus === "pending"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-zinc-100 text-zinc-800"
                        }`}
                      >
                        {person.verificationStatus === "verified"
                          ? "Подтверждено"
                          : person.verificationStatus === "rejected"
                            ? "Отклонено"
                            : person.verificationStatus === "pending"
                              ? "На проверке"
                              : "Не проверено"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {person.verificationStatus !== "verified" && (
                        <OfficeVerifyButton personId={person.id} />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-3 text-xs text-zinc-600" data-testid="office-registry-pagination">
              <span>
                Страница {currentPage} из {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="rounded border border-zinc-200 px-2 py-1 disabled:opacity-50"
                >
                  Назад
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="rounded border border-zinc-200 px-2 py-1 disabled:opacity-50"
                >
                  Вперед
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
