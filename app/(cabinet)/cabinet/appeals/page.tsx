import Link from "next/link";
import { redirect } from "next/navigation";
import { listAppeals } from "@/lib/appeals.store";
import { getSessionUser } from "@/lib/session.server";

export default async function CabinetAppealsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/cabinet/appeals");
  const items = listAppeals({ authorId: user.id });

  return (
    <div className="space-y-4" data-testid="cabinet-appeals-root">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Мои обращения</h1>
          <p className="text-sm text-zinc-600">Заявки, отправленные в правление</p>
        </div>
        <Link
          href="/cabinet/appeals/new"
          data-testid="cabinet-appeals-new-cta"
          className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4d5d41]"
        >
          Новая заявка
        </Link>
      </div>
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="grid grid-cols-3 gap-3 border-b border-zinc-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-600">
          <div>Тема</div>
          <div>Статус</div>
          <div>Дата</div>
        </div>
        {items.length === 0 ? (
          <div className="px-4 py-6 text-sm text-zinc-600" data-testid="cabinet-appeals-empty">
            Обращений пока нет.
            <Link
              href="/cabinet/appeals/new"
              data-testid="cabinet-appeals-empty-cta"
              className="ml-2 text-[#5E704F] hover:underline"
            >
              Создать обращение
            </Link>
          </div>
        ) : (
          items.map((item) => (
            <Link
              key={item.id}
              href={`/cabinet/appeals/${item.id}`}
              className="grid grid-cols-3 gap-3 border-b border-zinc-100 px-4 py-3 text-sm transition hover:bg-zinc-50"
            >
              <div className="font-semibold text-zinc-900">{item.title}</div>
              <div className="text-zinc-700">{item.status}</div>
              <div className="text-xs text-zinc-500">{new Date(item.updatedAt).toLocaleDateString("ru-RU")}</div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
