import Link from "next/link";
import { redirect } from "next/navigation";
import { membershipLabel } from "@/lib/membershipLabels";
import { listPlots } from "@/lib/plotsDb";
import { getSessionUser } from "@/lib/session.server";
import { Plot } from "@/types/snt";

const parseFilters = (searchParams?: { [key: string]: string | string[] | undefined }) => {
  const confirmedParam = typeof searchParams?.confirmed === "string" ? searchParams?.confirmed : undefined;
  const membershipParam =
    typeof searchParams?.membership === "string" ? searchParams?.membership : undefined;
  const q = typeof searchParams?.q === "string" ? searchParams?.q : undefined;
  const missingContacts =
    typeof searchParams?.missingContacts === "string" && searchParams?.missingContacts === "1";
  return {
    confirmed:
      confirmedParam === "1" ? true : confirmedParam === "0" ? false : undefined,
    membership:
      membershipParam === "UNKNOWN" ||
      membershipParam === "MEMBER" ||
      membershipParam === "NON_MEMBER"
        ? (membershipParam as Plot["membershipStatus"])
        : undefined,
    missingContacts,
    q,
  };
};

const statusConfirmed = (plot: Plot) => (plot.isConfirmed ? "Да" : "Нет");
const contactShort = (plot: Plot) => {
  if (plot.phone) return plot.phone;
  if (plot.email) return plot.email;
  return "—";
};

export default async function AdminPlotsPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    redirect("/login");
  }

  const filters = parseFilters(searchParams);
  const plots = listPlots(filters);

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Реестр участков</h1>
            <p className="text-sm text-zinc-600">Управление участками и контактами.</p>
          </div>
          <Link
            href="/admin/plots/new"
            className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41]"
          >
            Добавить участок
          </Link>
          <Link
            href="/admin/plots/import"
            className="rounded-full border border-white/30 bg-white px-4 py-2 text-sm font-semibold text-[#2F3827] transition-colors hover:bg-white/90"
          >
            Импорт CSV
          </Link>
        </div>

        <form className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-zinc-700">Подтверждён</label>
            <select
              name="confirmed"
              defaultValue={
                filters.confirmed === undefined ? "" : filters.confirmed ? "1" : "0"
              }
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="">Все</option>
              <option value="1">Да</option>
              <option value="0">Нет</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-zinc-700">Статус членства</label>
            <select
              name="membership"
              defaultValue={filters.membership ?? ""}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="">Все</option>
              <option value="UNKNOWN">Не определён</option>
              <option value="MEMBER">Член</option>
              <option value="NON_MEMBER">Не член</option>
            </select>
          </div>
          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700">
              <input
                type="checkbox"
                name="missingContacts"
                value="1"
                defaultChecked={filters.missingContacts}
                className="h-4 w-4 rounded border-zinc-300"
              />
              Нет контактов
            </label>
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-2">
            <label className="text-xs font-semibold text-zinc-700">Поиск</label>
            <input
              type="text"
              name="q"
              defaultValue={filters.q ?? ""}
              placeholder="Улица, номер или ФИО"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
            <button
              type="submit"
              className="w-full rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41]"
            >
              Применить
            </button>
            <Link
              href="/admin/plots"
              className="w-full rounded-full border border-zinc-300 px-4 py-2 text-center text-sm font-semibold text-zinc-700 transition-colors hover:border-zinc-400"
            >
              Сбросить
            </Link>
          </div>
        </form>

        {plots.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-700">Участков пока нет.</p>
            <Link
              href="/admin/plots/new"
              className="mt-3 inline-flex rounded-full border border-[#5E704F] px-4 py-2 text-xs font-semibold text-[#5E704F] transition-colors hover:bg-[#5E704F]/10"
            >
              Добавить участок
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="grid grid-cols-12 gap-3 border-b border-zinc-100 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
              <div className="col-span-3">Улица</div>
              <div className="col-span-2">Участок</div>
              <div className="col-span-3">ФИО</div>
              <div className="col-span-2">Контакты</div>
              <div className="col-span-1">Статус</div>
              <div className="col-span-1">Подтв.</div>
            </div>
            <div className="divide-y divide-zinc-100">
              {plots.map((plot) => (
                <Link
                  key={plot.id}
                  href={`/admin/plots/${plot.id}`}
                  className="grid grid-cols-12 items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-[#F8F1E9]"
                >
                  <div className="col-span-3 font-semibold text-zinc-900">{plot.street}</div>
                  <div className="col-span-2 text-zinc-800">{plot.number}</div>
                  <div className="col-span-3 text-zinc-800">{plot.ownerFullName || "—"}</div>
                  <div className="col-span-2 text-zinc-700">{contactShort(plot)}</div>
                  <div className="col-span-1 text-xs font-semibold text-zinc-700">
                    {membershipLabel[plot.membershipStatus]}
                  </div>
                  <div className="col-span-1 text-xs font-semibold text-zinc-700">
                    {statusConfirmed(plot)}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
