import Link from "next/link";
import { redirect } from "next/navigation";
import { listAppeals } from "@/lib/appeals.store";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { createAppealAction } from "./actions";

const statuses = [
  { value: "all", label: "Все" },
  { value: "new", label: "Новые" },
  { value: "in_progress", label: "В работе" },
  { value: "closed", label: "Закрытые" },
];

export default async function OfficeAppealsPage({ searchParams }: { searchParams: { status?: string; q?: string } }) {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff-login?next=/office/appeals");
  const role = (user.role as Role | undefined) ?? "resident";
  if (!(role === "chairman" || role === "accountant" || role === "secretary" || role === "admin")) {
    redirect("/forbidden");
  }

  const status = statuses.some((s) => s.value === searchParams.status) ? searchParams.status : "all";
  const q = searchParams.q?.trim() ?? "";
  const items = listAppeals({
    status: status === "all" ? undefined : (status as "new" | "in_progress" | "closed"),
    q,
  });

  return (
    <div className="space-y-4" data-testid="office-appeals-root">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Заявки</h1>
          <p className="text-sm text-zinc-600">Обращения жителей для обработки</p>
        </div>
        <Link
          href="/office/appeals?status=new"
          className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-[#5E704F] hover:border-[#5E704F]"
        >
          Новые
        </Link>
      </div>
      <form className="flex flex-wrap gap-3 text-sm">
        <select
          name="status"
          defaultValue={status}
          data-testid="office-appeals-filter-status"
          className="rounded-lg border border-zinc-200 px-3 py-2"
        >
          {statuses.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <input
          name="q"
          defaultValue={q}
          placeholder="Поиск по теме или автору"
          data-testid="office-appeals-search"
          className="min-w-[220px] flex-1 rounded-lg border border-zinc-200 px-3 py-2"
        />
        <button
          type="submit"
          className="rounded-full border border-zinc-200 px-4 py-2 font-semibold text-[#5E704F] hover:border-[#5E704F]"
        >
          Фильтровать
        </button>
      </form>

      <form
        action={createAppealAction}
        className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
      >
        <div className="text-sm font-semibold text-zinc-900">Добавить новую заявку</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-zinc-700">
            Тема
            <input
              name="title"
              required
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2"
              placeholder="Короткая тема"
            />
          </label>
          <label className="text-sm text-zinc-700 sm:col-span-2">
            Описание
            <textarea
              name="body"
              required
              rows={3}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2"
              placeholder="Опишите суть обращения"
            />
          </label>
        </div>
        <button
          type="submit"
          className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4d5d41]"
        >
          Создать заявку
        </button>
      </form>
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="grid grid-cols-4 gap-3 border-b border-zinc-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-600">
          <div>Тема</div>
          <div>Автор</div>
          <div>Статус</div>
          <div>Дата</div>
        </div>
        {items.length === 0 ? (
          <div className="px-4 py-6 text-sm text-zinc-600">Заявок пока нет.</div>
        ) : (
          items.map((item) => (
            <Link
              key={item.id}
              href={`/office/appeals/${item.id}`}
              data-testid={`office-appeals-item-${item.id}`}
              className="grid grid-cols-4 gap-3 border-b border-zinc-100 px-4 py-3 text-sm transition hover:bg-zinc-50"
            >
              <div className="font-semibold text-zinc-900">{item.title}</div>
              <div className="text-zinc-700">{item.authorName ?? "—"}</div>
              <div className="text-zinc-700">{item.status}</div>
              <div className="text-xs text-zinc-500">{new Date(item.updatedAt).toLocaleDateString("ru-RU")}</div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
