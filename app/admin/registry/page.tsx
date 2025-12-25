import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/session.server";
import { listPlotsWithFilters } from "@/lib/mockDb";
import { formatAdminTime } from "@/lib/settings";
import { useState } from "react";

function RegistryTableClient({
  plots,
  query,
}: {
  plots: Array<{
    id: string;
    street: string;
    plotNumber: string;
    membershipStatus?: string | null;
    status?: string | null;
    ownerFullName?: string | null;
    updatedAt: string;
  }>;
  query: string;
}) {
  "use client";
  const [selected, setSelected] = useState<string[]>([]);
  const allSelected = selected.length === plots.length && plots.length > 0;
  const toggleAll = () => {
    setSelected(allSelected ? [] : plots.map((p) => p.id));
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const [action, setAction] = useState("archive");
  const [membershipStatus, setMembershipStatus] = useState("MEMBER");
  const [comment, setComment] = useState("");

  const applyBulk = async () => {
    if (!selected.length) return;
    const payload =
      action === "set_membership"
        ? {
            membershipStatus,
          }
        : {};
    await fetch("/api/admin/registry/plots/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plotIds: selected, action, payload, comment }),
    });
    window.location.href = `/admin/registry?query=${encodeURIComponent(query)}`;
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3 text-sm shadow-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-zinc-300 text-[#5E704F]"
            checked={allSelected}
            onChange={toggleAll}
          />
          Выбрать все ({selected.length})
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="rounded border border-zinc-300 px-2 py-1"
          >
            <option value="archive">Архивировать</option>
            <option value="unarchive">Разархивировать</option>
            <option value="set_membership">Сменить членство</option>
            <option value="needs_review">Пометить на проверку</option>
          </select>
          {action === "set_membership" && (
            <select
              value={membershipStatus}
              onChange={(e) => setMembershipStatus(e.target.value)}
              className="rounded border border-zinc-300 px-2 py-1"
            >
              <option value="MEMBER">Член</option>
              <option value="NON_MEMBER">Не член</option>
              <option value="PENDING">На проверке</option>
            </select>
          )}
          <input
            type="text"
            placeholder="Комментарий"
            className="rounded border border-zinc-300 px-2 py-1"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <button
            type="button"
            onClick={applyBulk}
            className="rounded bg-[#5E704F] px-3 py-1 text-sm font-semibold text-white transition hover:bg-[#4f5f42]"
          >
            Применить
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-3 py-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-zinc-300 text-[#5E704F]"
                  checked={allSelected}
                  onChange={toggleAll}
                />
              </th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Улица</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Участок</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Членство</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Архив</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Владелец</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Обновлено</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {plots.map((plot) => (
              <tr key={plot.id} className="hover:bg-zinc-50">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-zinc-300 text-[#5E704F]"
                    checked={selected.includes(plot.id)}
                    onChange={() => toggleOne(plot.id)}
                  />
                </td>
                <td className="px-3 py-2 text-zinc-900">{plot.street}</td>
                <td className="px-3 py-2">
                  <Link href={`/admin/registry/${plot.id}`} className="text-[#5E704F] underline">
                    {plot.plotNumber}
                  </Link>
                </td>
                <td className="px-3 py-2 text-zinc-700">{plot.membershipStatus ?? "—"}</td>
                <td className="px-3 py-2 text-zinc-700">{plot.status === "archived" ? "Да" : "Нет"}</td>
                <td className="px-3 py-2 text-zinc-700">{plot.ownerFullName ?? "—"}</td>
                <td className="px-3 py-2 text-zinc-700">{formatAdminTime(plot.updatedAt)}</td>
              </tr>
            ))}
            {plots.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-center text-zinc-600" colSpan={7}>
                  Участков не найдено
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function RegistryPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const user = await getSessionUser();
  if (!isAdmin(user)) {
    redirect("/login");
  }

  const query = typeof searchParams.query === "string" ? searchParams.query : "";
  const page = Number(searchParams.page || "1");
  const { items, total, pageSize } = listPlotsWithFilters({
    query,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: 20,
  });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Реестр участков</h1>
          <Link
            href="/admin"
            className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
          >
            Назад
          </Link>
        </div>

        <form className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
          <input
            type="text"
            name="query"
            defaultValue={query}
            placeholder="Поиск по улице, участку, ФИО, телефону, email"
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4f5f42]"
          >
            Найти
          </button>
        </form>

        <RegistryTableClient
          plots={items}
          query={query}
        />

        <div className="flex items-center justify-between text-sm text-zinc-700">
          <div>
            Страница {page} из {totalPages} (всего {total})
          </div>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/registry?query=${encodeURIComponent(query)}&page=${page - 1}`}
                className="rounded border border-zinc-300 px-3 py-1 hover:bg-zinc-100"
              >
                Назад
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/registry?query=${encodeURIComponent(query)}&page=${page + 1}`}
                className="rounded border border-zinc-300 px-3 py-1 hover:bg-zinc-100"
              >
                Вперёд
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
