import Link from "next/link";
import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { canManageMeetingMinutes } from "@/lib/meetingMinutesAccess";
import { listMeetingMinutes } from "@/lib/meetingMinutes";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OfficeMeetingsPage({ searchParams }: Props) {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff-login?next=/office/meetings");
  if (!canManageMeetingMinutes(user.role)) redirect("/forbidden?reason=office.only&next=/office");

  const params = (await searchParams) ?? {};
  const q = typeof params.q === "string" ? params.q : "";
  const status = typeof params.status === "string" ? params.status : "all";

  const all = await listMeetingMinutes();
  const filtered = all.filter((item) => {
    if (status !== "all" && item.status !== status) return false;
    if (q) {
      const hay = `${item.title} ${item.date}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    }
    return true;
  });

  return (
    <div className="space-y-6" data-testid="office-meetings-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Протоколы собраний</h1>
          <p className="text-sm text-zinc-600">Составление, публикация и экспорт протоколов.</p>
        </div>
        <Link
          href="/office/meetings/new"
          className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4d5d41]"
        >
          + Новый протокол
        </Link>
      </div>

      <form className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-3">
        <label className="text-sm text-zinc-700">
          Поиск
          <input
            name="q"
            defaultValue={q}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            placeholder="Название или дата"
          />
        </label>
        <label className="text-sm text-zinc-700">
          Статус
          <select name="status" defaultValue={status} className="mt-1 w-full rounded border border-zinc-300 px-3 py-2">
            <option value="all">Все</option>
            <option value="draft">Черновик</option>
            <option value="published">Опубликован</option>
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700"
          >
            Применить
          </button>
        </div>
      </form>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-600">
          Протоколы не найдены.
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((item) => (
            <div key={item.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-zinc-900">{item.title}</div>
                  <div className="text-xs text-zinc-600">Дата: {item.date}</div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  {item.status === "published" ? "Опубликован" : "Черновик"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                <Link href={`/office/meetings/${item.id}`} className="text-[#5E704F] font-semibold">
                  Открыть
                </Link>
                <button
                  type="button"
                  onClick={() => window.open(`/api/office/meetings/${item.id}/export.pdf`, "_blank", "noopener,noreferrer")}
                  className="text-zinc-700"
                >
                  Экспорт PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
