"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppRouter } from "@/hooks/useAppRouter";
import { plotStatusLabel } from "@/lib/plotStatusLabels";

type Props = {
  initialQuery: string;
  initialStatus: string;
};

export default function RegistryFiltersClient({ initialQuery, initialStatus }: Props) {
  const router = useAppRouter();
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState(initialStatus);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(t);
  }, [query]);

  const params = useMemo(() => {
    const sp = new URLSearchParams();
    if (debouncedQuery) sp.set("query", debouncedQuery);
    if (status) sp.set("status", status);
    return sp.toString();
  }, [debouncedQuery, status]);

  useEffect(() => {
    router.push(params ? `/admin/registry?${params}` : "/admin/registry");
  }, [params, router]);

  const resetFilters = () => {
    setQuery("");
    setStatus("");
  };

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Поиск по участку, кадастру, владельцу"
        className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
      />
      <select
        value={status}
        onChange={(event) => setStatus(event.target.value)}
        className="rounded border border-zinc-300 px-3 py-2 text-sm"
      >
        <option value="">Все статусы</option>
        <option value="DRAFT">{plotStatusLabel("DRAFT")}</option>
        <option value="INVITE_READY">{plotStatusLabel("INVITE_READY")}</option>
        <option value="CLAIMED">{plotStatusLabel("CLAIMED")}</option>
        <option value="VERIFIED">{plotStatusLabel("VERIFIED")}</option>
      </select>
      <button
        type="button"
        onClick={resetFilters}
        className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400"
      >
        Сбросить фильтры
      </button>
    </div>
  );
}
