import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { canManageMeetingMinutes } from "@/lib/meetingMinutesAccess";
import { listDecisionRegistry } from "@/lib/meetingMinutes";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OfficeDecisionsPage({ searchParams }: Props) {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff-login?next=/office/decisions");
  if (!canManageMeetingMinutes(user.role)) redirect("/forbidden?reason=office.only&next=/office");

  const params = (await searchParams) ?? {};
  const q = typeof params.q === "string" ? params.q : "";
  const status = typeof params.status === "string" ? params.status : "";
  const category = typeof params.category === "string" ? params.category : "";
  const from = typeof params.from === "string" ? params.from : "";
  const to = typeof params.to === "string" ? params.to : "";

  const rows = await listDecisionRegistry({
    q: q || null,
    status: status || null,
    category: category || null,
    from: from || null,
    to: to || null,
  });

  return (
    <div className="space-y-6" data-testid="office-decisions-page">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Реестр решений</h1>
        <p className="text-sm text-zinc-600">Сводный список решений по всем протоколам.</p>
      </div>

      <form className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-5">
        <label className="text-sm text-zinc-700 sm:col-span-2">
          Поиск
          <input
            name="q"
            defaultValue={q}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            placeholder="Решение или протокол"
          />
        </label>
        <label className="text-sm text-zinc-700">
          Категория
          <input name="category" defaultValue={category} className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" />
        </label>
        <label className="text-sm text-zinc-700">
          Статус
          <select name="status" defaultValue={status} className="mt-1 w-full rounded border border-zinc-300 px-3 py-2">
            <option value="">Любой</option>
            <option value="approved">Принято</option>
            <option value="rejected">Отклонено</option>
            <option value="postponed">Отложено</option>
          </select>
        </label>
        <div className="grid gap-2 sm:col-span-5 sm:grid-cols-2">
          <label className="text-sm text-zinc-700">
            Дата от
            <input type="date" name="from" defaultValue={from} className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" />
          </label>
          <label className="text-sm text-zinc-700">
            Дата до
            <input type="date" name="to" defaultValue={to} className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" />
          </label>
        </div>
        <div className="sm:col-span-5">
          <button
            type="submit"
            className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700"
          >
            Применить
          </button>
        </div>
      </form>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-600">
          Решения не найдены.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                <th className="px-4 py-3">Решение</th>
                <th className="px-4 py-3">Протокол</th>
                <th className="px-4 py-3">Категория</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Документ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((row) => (
                <tr key={`${row.meetingId}-${row.id}`} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 text-zinc-900 font-semibold">{row.title}</td>
                  <td className="px-4 py-3 text-zinc-700">
                    {row.meetingTitle} • {row.meetingDate}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{row.category ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-700">{row.status ?? "—"}</td>
                  <td className="px-4 py-3">
                    <a href={row.docUrl} className="text-[#5E704F] font-semibold" target="_blank" rel="noreferrer">
                      PDF
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
