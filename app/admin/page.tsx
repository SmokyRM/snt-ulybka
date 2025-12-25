import Link from "next/link";
import { listPlots } from "@/lib/plotsDb";
import { listTickets } from "@/lib/ticketsDb";

const safeFormatBuildTime = (raw?: string | null) => {
  if (!raw) return "—";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "—";
  const formatter = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const formatted = formatter.format(date);
  return formatted.replace(",", " в");
};

export default function AdminDashboard() {
  const buildRaw =
    process.env.BUILD_TIME ||
    process.env.VERCEL_DEPLOYMENT_ID ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    new Date().toISOString();
  const lastUpdate = safeFormatBuildTime(buildRaw);
  const newTicketsCount = listTickets("NEW").length;
  const plots = listPlots();
  const unconfirmedCount = plots.filter((p) => !p.isConfirmed).length;
  const missingContactsCount = plots.filter((p) => !p.phone && !p.email).length;

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Админ-панель</h1>
          <span className="rounded-full bg-[#2F3827]/10 px-3 py-1 text-xs font-semibold text-[#2F3827]">
            Только для админов
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/admin/requests"
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-[#5E704F]/50"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-[#5E704F]">
              Заявки/обращения
            </p>
            <h2 className="mt-2 text-lg font-semibold text-zinc-900">Перейти к заявкам</h2>
            <p className="mt-2 text-sm text-zinc-700">
              Управление запросами на подтверждение и обращениями жителей.
            </p>
          </Link>

          <Link
            href="/admin/plots"
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-[#5E704F]/50"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-[#5E704F]">
              Реестр участков
            </p>
            <h2 className="mt-2 text-lg font-semibold text-zinc-900">Участки и собственники</h2>
            <p className="mt-2 text-sm text-zinc-700">
              Участки, собственники, статусы членства.
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-[#2F3827]">
              <span className="rounded-full bg-[#5E704F]/10 px-3 py-1">
                Не подтверждено: {unconfirmedCount}
              </span>
              <span className="rounded-full bg-[#5E704F]/10 px-3 py-1">
                Без контактов: {missingContactsCount}
              </span>
            </div>
          </Link>

          <Link
            href="/admin/tickets"
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-[#5E704F]/50"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-[#5E704F]">
              Обращения жителей
            </p>
            <div className="mt-2 flex items-center gap-2">
              <h2 className="text-lg font-semibold text-zinc-900">Перейти в тикеты</h2>
              {newTicketsCount > 0 && (
                <span className="rounded-full bg-[#5E704F]/10 px-2 py-1 text-xs font-bold text-[#2F3827]">
                  {newTicketsCount}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-zinc-700">
              Все обращения, статус и работа с тикетами.
            </p>
          </Link>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Реестр участков
            </p>
            <h2 className="mt-2 text-lg font-semibold text-zinc-900">Скоро</h2>
            <p className="mt-2 text-sm text-zinc-700">
              Работа с участками и статусами владельцев появится здесь.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Публикации документов
            </p>
            <h2 className="mt-2 text-lg font-semibold text-zinc-900">Скоро</h2>
            <p className="mt-2 text-sm text-zinc-700">
              Добавление протоколов, решений и объявлений для сайта.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:col-span-2 lg:col-span-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Последнее обновление сайта
            </p>
            <h2 className="mt-2 text-lg font-semibold text-zinc-900">{lastUpdate}</h2>
            <p className="mt-2 text-sm text-zinc-700">
              Время сборки/деплоя. Информация видна только в админ-панели.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
