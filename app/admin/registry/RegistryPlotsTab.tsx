"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { listPlots } from "@/lib/plotsDb";
import { Plot } from "@/types/snt";
import ClientTable from "../plots/ClientTable";
import FiltersClient from "../plots/FiltersClient";

const parseFilters = (params?: Record<string, string | string[] | undefined>) => {
  const confirmedParam = typeof params?.confirmed === "string" ? params.confirmed : undefined;
  const membershipParam = typeof params?.membership === "string" ? params.membership : undefined;
  const q = typeof params?.q === "string" ? params.q : undefined;
  const missingContacts = typeof params?.missingContacts === "string" && params.missingContacts === "1";
  return {
    confirmed: confirmedParam === "1" ? true : confirmedParam === "0" ? false : undefined,
    membership:
      membershipParam === "UNKNOWN" || membershipParam === "MEMBER" || membershipParam === "NON_MEMBER"
        ? (membershipParam as Plot["membershipStatus"])
        : undefined,
    missingContacts,
    q,
  };
};

export default function RegistryPlotsTab() {
  const searchParams = useSearchParams();
  const [plots, setPlots] = useState<Array<Plot & { id: string; plotId: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params = Object.fromEntries(searchParams.entries());
      const filters = parseFilters(params);
      const plotsData = listPlots(filters);
      setPlots(plotsData);
      setLoading(false);
    }, 0);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  const filters = parseFilters(Object.fromEntries(searchParams.entries()));

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-zinc-600">Загрузка...</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Реестр участков</h2>
          <p className="text-sm text-zinc-600">Управление участками и контактами.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/plots/new"
            className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41]"
          >
            Добавить участок
          </Link>
          <Link
            href="/admin/registry?tab=import"
            className="rounded-full border border-white/30 bg-white px-4 py-2 text-sm font-semibold text-[#2F3827] transition-colors hover:bg-white/90"
          >
            Импорт CSV
          </Link>
        </div>
      </div>

      <FiltersClient initialFilters={filters} />

      {plots.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-700">Участков пока нет.</p>
          <Link
            href="/admin/plots/new"
            className="mt-3 inline-flex rounded-full border border-[#5E704F] px-4 py-2 text-xs font-semibold text-[#5E704F] transition-colors hover:bg-[#5E704F]/10"
          >
            Добавить участок
          </Link>
        </div>
      ) : (
        <ClientTable plots={plots} />
      )}
    </div>
  );
}
