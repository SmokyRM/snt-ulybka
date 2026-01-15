import { redirect } from "next/navigation";
import { getSessionUser, hasBillingAccess } from "@/lib/session.server";
import { listBillingImports } from "@/lib/mockDb";
import ImportBatchesClient from "./ImportBatchesClient";

export default async function ImportBatchesPage() {
  const user = await getSessionUser();
  if (!hasBillingAccess(user)) redirect("/staff/login?next=/admin");
  const batches = listBillingImports();

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-8 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Журнал импортов платежей</h1>
          <a
            href="/admin/billing/import"
            className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
          >
            Новый импорт
          </a>
        </div>
        <p className="text-sm text-zinc-600">
          История CSV-импортов с их статусами и количеством обработанных строк.
        </p>
        <ImportBatchesClient initialBatches={batches} />
      </div>
    </main>
  );
}
