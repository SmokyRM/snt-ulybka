import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/session.server";
import { listPlots } from "@/lib/plotsDb";
import { Plot } from "@/types/snt";
import ClientTable from "./ClientTable";
import FiltersClient from "./FiltersClient";

const parseFilters = (params?: Record<string, string | string[] | undefined>) => {
  const confirmedParam = typeof params?.confirmed === "string" ? params.confirmed : undefined;
  const membershipParam = typeof params?.membership === "string" ? params.membership : undefined;
  const q = typeof params?.q === "string" ? params.q : undefined;
  const missingContacts = typeof params?.missingContacts === "string" && params.missingContacts === "1";
  return {
    confirmed: confirmedParam === "1" ? true : confirmedParam === "0" ? false : undefined,
    membership:
      membershipParam === "UNKNOWN" || membershipParam === "MEMBER" || membershipParam === "NON_MEMBER"
        ? (membershipParam as Plot["membershipStatus"])
        : undefined,
    missingContacts,
    q,
  };
};

export default async function AdminPlotsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const user = await getSessionUser();
  if (!isAdmin(user)) {
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

        <FiltersClient initialFilters={filters} />

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
          <ClientTable plots={plots} />
        )}
      </div>
    </main>
  );
}
