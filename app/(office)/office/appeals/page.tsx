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
          ))
        )}
      </div>
    </div>
  );
}

function isAppealStatus(value: string): value is AppealStatus {
  return value === "new" || value === "in_progress" || value === "done";
}
