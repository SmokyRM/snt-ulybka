import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/session.server";
import ImportClient from "./ImportClient";

export default async function BillingImportPage() {
  const user = await getSessionUser();
  if (!isAdmin(user)) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Импорт платежей (preview)</h1>
          <a
            href="/admin"
            className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
          >
            Назад
          </a>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-800 shadow-sm space-y-3">
          <div className="flex flex-wrap gap-3">
            <a
              href="/api/admin/billing/import/template.csv"
              className="rounded-full border border-[#5E704F] px-3 py-1 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
            >
              Скачать шаблон CSV
            </a>
            <div className="text-sm text-zinc-700">
              Как подготовить: разделитель ;, UTF-8, колонки: Дата, Сумма, Назначение, Улица, Участок, Номер операции.
              Пример назначения: &quot;ул. Березовая уч.12 за ноябрь 2025&quot;.
            </div>
          </div>
        </div>
        <ImportClient />
      </div>
    </main>
  );
}
