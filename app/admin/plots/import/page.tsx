import Link from "next/link";
import { redirect } from "next/navigation";
import CsvImportForm from "./CsvImportForm";
import { listPlots } from "@/lib/plotsDb";
import { getSessionUser, hasImportAccess } from "@/lib/session.server";

const normalizeKey = (street: string, number: string) =>
  `${street.trim().toLowerCase()}|${number.trim().toLowerCase()}`;

export default async function ImportPlotsPage() {
  const user = await getSessionUser();
  if (!hasImportAccess(user)) {
    redirect("/staff/login?next=/admin");
  }

  const plots = listPlots();
  const existingKeys = plots.map((p) => normalizeKey(p.street, p.number));

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Импорт участков (CSV)</h1>
            <p className="text-sm text-zinc-600">
              Загрузите CSV по формату: street, number, ownerFullName?, phone?, email?, membershipStatus (UNKNOWN|MEMBER|NON_MEMBER), isConfirmed (0/1).
            </p>
          </div>
          <Link
            href="/admin/plots"
            className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:border-zinc-400"
          >
            К списку
          </Link>
        </div>
        <CsvImportForm existingKeys={existingKeys} />
      </div>
    </main>
  );
}
