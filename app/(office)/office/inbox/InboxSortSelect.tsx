"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  currentSort: "createdAt" | "dueAt" | "updatedAt";
  currentDir: "asc" | "desc";
};

export default function InboxSortSelect({ currentSort, currentDir }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [newSort, newDir] = e.target.value.split("-");
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", newSort);
    params.set("dir", newDir);
    router.push(`/office/inbox?${params.toString()}`);
  };

  return (
    <select
      className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:border-[#5E704F] focus:outline-none"
      value={`${currentSort}-${currentDir}`}
      onChange={handleChange}
    >
      <option value="updatedAt-desc">Обновлено (новые)</option>
      <option value="updatedAt-asc">Обновлено (старые)</option>
      <option value="createdAt-desc">Создано (новые)</option>
      <option value="createdAt-asc">Создано (старые)</option>
      <option value="dueAt-asc">Срок (ближайшие)</option>
      <option value="dueAt-desc">Срок (дальние)</option>
    </select>
  );
}
