<<<<<<< HEAD
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
  const rawRole = user.role as import("@/lib/rbac").Role | "user" | "board" | undefined;
  const { canAccess, getForbiddenReason } = await import("@/lib/rbac");
  const normalizedRole: import("@/lib/rbac").Role =
    rawRole === "user" || rawRole === "board"
      ? "resident"
      : rawRole ?? "guest";

  // Guard: office.access
  if (!canAccess(normalizedRole, "office.access")) {
    const reason = getForbiddenReason(normalizedRole, "office.access");
    redirect(`/forbidden?reason=${encodeURIComponent(reason)}&next=${encodeURIComponent("/office/appeals")}`);
  }

  // Guard: office.appeals.read
  if (!canAccess(normalizedRole, "office.appeals.read")) {
    const reason = getForbiddenReason(normalizedRole, "office.appeals.read");
    redirect(`/forbidden?reason=${encodeURIComponent(reason)}&next=${encodeURIComponent("/office/appeals")}`);
  }

  // UI permissions
  const canRead = canAccess(normalizedRole, "office.appeals.read");
  const canComment = canAccess(normalizedRole, "office.appeals.comment");
  const canStatus = canAccess(normalizedRole, "office.appeals.status");

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

      {canRead && !canComment ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" data-testid="office-appeals-readonly-hint">
          Только просмотр
        </div>
      ) : null}

      {canComment ? (
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
            data-testid="office-appeals-create"
            className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4d5d41]"
          >
            Создать заявку
          </button>
        </form>
      ) : null}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="grid grid-cols-4 gap-3 border-b border-zinc-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-600">
          <div>Тема</div>
          <div>Автор</div>
          <div>Статус</div>
          <div>Дата</div>
        </div>
        {items.length === 0 ? (
          <div className="px-4 py-6 text-sm text-zinc-600" data-testid="office-appeals-empty">
            Заявок пока нет.
          </div>
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
=======
import { redirect } from "next/navigation";
import AppLink from "@/components/AppLink";
import { getSessionUser } from "@/lib/session.server";
import { can, type Role } from "@/lib/permissions";
import { listAppeals, type AppealStatus } from "@/lib/appeals.store";

const statusLabels: Record<AppealStatus, string> = {
  new: "Новое",
  in_progress: "В работе",
  done: "Завершено",
};

const statusClass: Record<AppealStatus, string> = {
  new: "bg-blue-100 text-blue-800",
  in_progress: "bg-amber-100 text-amber-800",
  done: "bg-emerald-100 text-emerald-800",
};

type Props = {
  searchParams?: {
    status?: AppealStatus;
    q?: string;
  };
};

export default async function OfficeAppealsPage({ searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/office/appeals");
  const role = (user.role as Role | undefined) ?? "resident";
  if (!can(role === "admin" ? "chairman" : role, "office.appeals.manage")) {
    redirect("/forbidden");
  }

  const rawStatus = searchParams?.status;
  const statusParam = rawStatus && isAppealStatus(rawStatus) ? rawStatus : undefined;
  const q = searchParams?.q ?? "";
  const appeals = listAppeals({ status: statusParam, q });

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm" data-testid="office-appeals-root">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Обращения</h1>
          <p className="text-sm text-zinc-600">Список обращений жителей.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm text-zinc-600">
          <span className="rounded-full bg-zinc-100 px-3 py-1">Всего: {appeals.length}</span>
          {statusParam ? <span className="rounded-full bg-zinc-50 px-3 py-1">Фильтр: {statusLabels[statusParam]}</span> : null}
          {q ? <span className="rounded-full bg-zinc-50 px-3 py-1">Поиск: “{q}”</span> : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {appeals.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-600">
            Обращений по выбранным фильтрам пока нет.
          </div>
        ) : (
          appeals.map((appeal) => (
            <AppLink
              key={appeal.id}
              href={`/office/appeals/${appeal.id}`}
              className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              data-testid="appeals-list-item"
            >
              <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${statusClass[appeal.status]}`}>
              {statusLabels[appeal.status]}
            </span>
                <span className="text-xs text-zinc-500">
                  Обновлено {new Date(appeal.updatedAt).toLocaleDateString("ru-RU")}
                </span>
              </div>
              <div className="text-base font-semibold text-zinc-900">{appeal.title}</div>
              <div className="text-sm text-zinc-600 line-clamp-2">{appeal.body}</div>
              <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
                {appeal.plotNumber ? <span>Участок: {appeal.plotNumber}</span> : null}
                {appeal.authorName ? <span>Автор: {appeal.authorName}</span> : null}
              </div>
            </AppLink>
>>>>>>> 737c5be (codex snapshot)
          ))
        )}
      </div>
    </div>
  );
}
<<<<<<< HEAD
=======

function isAppealStatus(value: string): value is AppealStatus {
  return value === "new" || value === "in_progress" || value === "done";
}
>>>>>>> 737c5be (codex snapshot)
