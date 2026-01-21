"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  currentSortBy: "createdAt" | "dueAt" | "updatedAt";
  currentSortOrder: "asc" | "desc";
};

export default function InboxSortClient({ currentSortBy, currentSortOrder }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSortByChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sortBy", e.target.value);
    router.push(`/office/inbox?${params.toString()}`);
  };

  const handleSortOrderToggle = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sortOrder", currentSortOrder === "asc" ? "desc" : "asc");
    router.push(`/office/inbox?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2" data-testid="inbox-sort">
      <span className="text-sm font-medium text-zinc-700">Сортировка:</span>
      <select
        value={currentSortBy}
        onChange={handleSortByChange}
        className="rounded-lg border border-zinc-200 px-2 py-1.5 text-sm text-zinc-800 focus:border-[#5E704F] focus:outline-none"
        data-testid="inbox-sort-by"
      >
        <option value="updatedAt">По обновлению</option>
        <option value="createdAt">По созданию</option>
        <option value="dueAt">По сроку</option>
      </select>
      <button
        onClick={handleSortOrderToggle}
        className="rounded-lg border border-zinc-200 px-2 py-1.5 text-sm font-semibold text-zinc-700 transition hover:border-[#5E704F]"
        data-testid="inbox-sort-order"
        title={currentSortOrder === "asc" ? "По возрастанию" : "По убыванию"}
      >
        {currentSortOrder === "asc" ? "↑" : "↓"}
      </button>
    </div>
  );
}
