import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/session.server";
import ImportPlotsClient from "./ImportPlotsClient";

export default async function PlotsImportPage() {
  const user = await getSessionUser();
  if (!isAdmin(user)) {
    redirect("/login?next=/admin");
  }

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Импорт реестра участков (CSV)</h1>
          <a
            href="/admin/registry"
            className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
          >
            Назад к реестру
          </a>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>Поддерживается CSV с разделителем ; или , (UTF-8).</div>
            <a
              href="/fixtures/plots_valid.csv"
              className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-100"
            >
              Скачать шаблон CSV
            </a>
          </div>
        </div>

        <ImportPlotsClient />

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-700 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">Как подготовить CSV</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            <li>Одна строка = один участок.</li>
            <li>Обязательный ключ: cadastral или plotNumber.</li>
            <li>
              Колонки: cadastral, plotNumber, street, ownerName, phone, email,
              membershipStatus, confirmed.
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
