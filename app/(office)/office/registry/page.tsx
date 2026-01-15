import Link from "next/link";
import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isOfficeRole } from "@/lib/rbac";
import { searchPlots } from "@/lib/office/registry.server";

type Props = {
  searchParams?: { q?: string };
};

const statusLabel: Record<string, string> = {
  verified: "Подтверждено",
  pending: "На проверке",
  draft: "Черновик",
};

const statusClass: Record<string, string> = {
  verified: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
  draft: "bg-zinc-100 text-zinc-700",
};

export default async function OfficeRegistryPage({ searchParams }: Props) {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff-login?next=/office/registry");
  const role = (user?.role as Role | undefined) ?? "resident";
  if (!isOfficeRole(role)) redirect("/forbidden");
  const q = searchParams?.q ?? "";
  const items = await searchPlots(q);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm" data-testid="office-registry-root">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Реестр участков</h1>
          <p className="text-sm text-zinc-600">Данные по участкам и владельцам.</p>
        </div>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700">Всего: {items.length}</span>
      </div>

      <form className="mt-4 grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 sm:grid-cols-3">
        <label className="sm:col-span-2">
          <span className="text-xs font-semibold text-zinc-600">Поиск</span>
          <input
            type="text"
            name="q"
            defaultValue={q}
            data-testid="office-registry-search"
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-[#5E704F] focus:outline-none"
            placeholder="Участок, владелец, телефон"
          />
        </label>
        <div className="sm:col-span-1 sm:self-end">
          <button
            type="submit"
            className="w-full rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4d5d41]"
          >
            Применить
          </button>
        </div>
      </form>

      <div className="mt-4 overflow-x-auto" data-testid="office-registry-results">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
              <th className="px-3 py-2">Участок</th>
              <th className="px-3 py-2">Владелец</th>
              <th className="px-3 py-2">Контакты</th>
              <th className="px-3 py-2">Статус</th>
              <th className="px-3 py-2">Обновлено</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-sm text-zinc-600">
                  Ничего не найдено по заданному запросу.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} data-testid={`office-registry-row-${item.id}`}>
                  <td className="px-3 py-2 text-sm font-semibold text-[#5E704F]">
                    <Link href={`/office/registry/${item.id}`} className="hover:underline">
                      {item.number}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-sm text-zinc-800">{item.ownerName ?? "—"}</td>
                  <td className="px-3 py-2 text-sm text-zinc-700">
                    {item.phone ? <div>{item.phone}</div> : <div className="text-xs text-zinc-500">Нет контактов</div>}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold bg-zinc-100 text-zinc-700">
                      Доступно
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm text-zinc-600">—</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
