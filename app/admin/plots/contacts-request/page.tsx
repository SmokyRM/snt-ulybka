import Link from "next/link";
import { redirect } from "next/navigation";
import CopyActions from "./CopyActions";
import { membershipLabel } from "@/lib/membershipLabels";
import { listPlots } from "@/lib/plotsDb";
import { getSessionUser } from "@/lib/session.server";

const matchesSearch = (street: string, number: string, name?: string | null, q?: string) => {
  if (!q) return true;
  const haystack = `${street} ${number} ${name ?? ""}`.toLowerCase();
  return haystack.includes(q.toLowerCase());
};

export default async function ContactsRequestPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    redirect("/login");
  }

  const q = typeof searchParams?.q === "string" ? searchParams.q : undefined;
  const missPhone = searchParams?.missingPhone === "1";
  const missEmail = searchParams?.missingEmail === "1";
  const missBoth = searchParams?.missingBoth === "1" || (!missPhone && !missEmail);

  const plots = listPlots();
  const counts = {
    missingContacts: plots.filter((p) => !p.phone && !p.email).length,
    missingPhone: plots.filter((p) => !p.phone).length,
    missingEmail: plots.filter((p) => !p.email).length,
  };

  const filtered = plots.filter((p) => {
    const noPhone = !p.phone;
    const noEmail = !p.email;
    const matchMissing =
      (missBoth && noPhone && noEmail) ||
      (missPhone && noPhone) ||
      (missEmail && noEmail);
    return matchMissing && matchesSearch(p.street, p.number, p.ownerFullName, q);
  });

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Запрос контактов</h1>
            <p className="text-sm text-zinc-600">Участки без контактов для актуализации реестра.</p>
          </div>
          <Link
            href="/admin/plots"
            className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:border-zinc-400"
          >
            К реестру
          </Link>
        </div>

        <div className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:grid-cols-4">
          <div className="rounded-xl bg-[#5E704F]/10 px-4 py-3 text-sm font-semibold text-[#2F3827]">
            Без контактов: {counts.missingContacts}
          </div>
          <div className="rounded-xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-800">
            Без телефона: {counts.missingPhone}
          </div>
          <div className="rounded-xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-800">
            Без почты: {counts.missingEmail}
          </div>
          <form className="flex items-center gap-2 sm:col-span-1">
            <input
              type="text"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Поиск"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-full bg-[#5E704F] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#4d5d41]"
            >
              Найти
            </button>
          </form>
        </div>

        <form className="flex flex-wrap gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-sm shadow-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="missingBoth" value="1" defaultChecked={missBoth} />
            Нет контактов
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="missingPhone" value="1" defaultChecked={missPhone} />
            Нет телефона
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="missingEmail" value="1" defaultChecked={missEmail} />
            Нет почты
          </label>
          <button
            type="submit"
            className="rounded-full bg-[#5E704F] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#4d5d41]"
          >
            Применить
          </button>
        </form>

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-3">
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="grid grid-cols-12 gap-3 border-b border-zinc-100 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                <div className="col-span-3">Улица</div>
                <div className="col-span-2">Участок</div>
                <div className="col-span-3">ФИО</div>
                <div className="col-span-2">Телефон</div>
                <div className="col-span-2">Почта</div>
                <div className="col-span-1">Статус</div>
                <div className="col-span-1">Подтв.</div>
              </div>
              <div className="divide-y divide-zinc-100">
                {filtered.map((plot) => (
                  <div key={plot.id} className="grid grid-cols-12 items-center gap-3 px-4 py-3 text-sm">
                    <div className="col-span-3 font-semibold text-zinc-900">{plot.street}</div>
                    <div className="col-span-2 text-zinc-800">{plot.number}</div>
                    <div className="col-span-3 text-zinc-800">{plot.ownerFullName || "—"}</div>
                    <div className="col-span-2 text-zinc-700">{plot.phone || "—"}</div>
                    <div className="col-span-2 text-zinc-700">{plot.email || "—"}</div>
                    <div className="col-span-1 text-xs font-semibold text-zinc-700">
                      {membershipLabel[plot.membershipStatus]}
                    </div>
                    <div className="col-span-1 text-xs font-semibold text-zinc-700">
                      {plot.isConfirmed ? "Да" : "Нет"}
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <div className="px-4 py-6 text-sm text-zinc-700">Нет подходящих участков.</div>
                )}
              </div>
            </div>
          </div>
          <CopyActions rows={filtered} />
        </div>
      </div>
    </main>
  );
}

