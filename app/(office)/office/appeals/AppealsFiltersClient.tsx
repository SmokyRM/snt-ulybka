"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AppLink from "@/components/AppLink";

export default function AppealsFiltersClient({
  tab,
  initialQuery,
  limit,
}: {
  tab: "new" | "in_progress" | "overdue" | "closed";
  initialQuery: string;
  limit: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams();
      params.set("tab", tab);
      params.set("page", "1");
      params.set("limit", String(limit));
      if (query) params.set("q", query);
      router.replace(`${pathname}?${params.toString()}`);
    }, 400);
    return () => clearTimeout(timeoutId);
  }, [query, tab, limit, pathname, router]);

  return (
    <div className="flex gap-2">
      <input type="hidden" name="tab" value={tab} />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Поиск по ФИО, участку, теме..."
        className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:border-[#5E704F] focus:outline-none"
        data-testid="office-search"
      />
      {query ? (
        <AppLink
          href={`/office/appeals?tab=${tab}&page=1&limit=${limit}`}
          className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-[#5E704F]"
          data-testid="office-reset-filters"
        >
          Сбросить
        </AppLink>
      ) : null}
    </div>
  );
}
