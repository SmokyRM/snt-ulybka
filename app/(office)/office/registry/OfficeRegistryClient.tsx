"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { RegistryPerson } from "@/types/snt";
import { apiPost, readOk } from "@/lib/api/client";

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
}

export default function OfficeRegistryClient({ initialPersons, initialQuery = "" }: OfficeRegistryClientProps) {
  const [persons, setPersons] = useState<EnrichedPerson[]>(initialPersons);
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadPersons();
    }, 0);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const loadPersons = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);

      const res = await fetch(`/api/admin/registry?${params.toString()}`);
      const data = await readOk<{ persons?: EnrichedPerson[] }>(res);
      setPersons(data?.persons || []);
    } catch (e) {
      setError((e as Error).message || "Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Реестр СНТ</h1>
          <p className="mt-1 text-sm text-zinc-600">Просмотр данных участков и владельцев</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск: ФИО, телефон, email"
          className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-zinc-600">Загрузка...</div>
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
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                    Реестр пуст
                  </td>
                </tr>
              ) : (
                persons.map((person) => (
                  <tr key={person.id} className="hover:bg-zinc-50">
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
        </div>
      )}
    </div>
  );
}
