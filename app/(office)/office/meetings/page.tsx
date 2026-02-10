import Link from "next/link";
import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { isStaffOrAdmin } from "@/lib/rbac";
import type { Role } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";
import { listMeetings, hasPgConnection } from "@/lib/meetings.pg";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OfficeMeetingsPage({ searchParams }: Props) {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff-login?next=/office/meetings");
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role) || !hasPermission(role, "meetings.manage")) {
    redirect("/forbidden?reason=office.only&next=/office");
  }

  const params = (await searchParams) ?? {};
  const q = typeof params.q === "string" ? params.q : "";
  const status = typeof params.status === "string" ? params.status : "all";

  const all = hasPgConnection()
    ? await listMeetings({ status: status === "all" ? null : (status as "draft" | "published" | "closed" | "archived") })
    : [];
  const filtered = all.filter((item) => {
    if (q) {
      const hay = `${item.title}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    }
    return true;
  });

  return (
    <div className="space-y-6" data-testid="office-meetings-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Собрания</h1>
          <p className="text-sm text-zinc-600">Повестка, материалы, вопросы жителей и результаты.</p>
        </div>
        <Link
          href="/office/meetings/new"
          className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4d5d41]"
        >
          + Новое собрание
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
            <option value="closed">Закрыт</option>
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
          Собрания не найдены.
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((item) => (
            <div key={item.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-zinc-900">{item.title}</div>
                  <div className="text-xs text-zinc-600">Статус: {item.status}</div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.status === "published" ? "bg-emerald-100 text-emerald-700" : item.status === "closed" ? "bg-zinc-100 text-zinc-600" : "bg-amber-100 text-amber-700"}`}>
                  {item.status === "published" ? "Опубликован" : item.status === "closed" ? "Закрыт" : "Черновик"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                <Link href={`/office/meetings/${item.id}`} className="text-[#5E704F] font-semibold">
                  Открыть
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
