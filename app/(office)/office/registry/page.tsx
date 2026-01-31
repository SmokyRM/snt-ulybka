import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { isAdminRole, isOfficeRole } from "@/lib/rbac";
import OfficeRegistryClient from "./OfficeRegistryClient";
import { listPersons, listPlots } from "@/lib/registry/core";

type VerificationStatus = "not_verified" | "pending" | "verified" | "rejected";

export default async function OfficeRegistryPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/staff-login?next=/office/registry");
  }

  const role = user.role;
  if (!isAdminRole(role) && !isOfficeRole(role)) {
    redirect("/forbidden?reason=office.only&next=/office/registry");
  }

  const params = (await searchParams) ?? {};
  const q = typeof params.q === "string" ? params.q : undefined;
  const verificationStatusRaw =
    typeof params.verificationStatus === "string" ? params.verificationStatus : undefined;
  const verificationStatus = (["not_verified", "pending", "verified", "rejected"] as const).includes(
    verificationStatusRaw as VerificationStatus,
  )
    ? (verificationStatusRaw as VerificationStatus)
    : undefined;
  const page = Math.max(1, Number(typeof params.page === "string" ? params.page : "1") || 1);
  const limit = Math.min(50, Math.max(5, Number(typeof params.limit === "string" ? params.limit : "10") || 10));

  const persons = listPersons({ q, verificationStatus });
  const total = persons.length;
  const start = (page - 1) * limit;
  const pageItems = persons.slice(start, start + limit);
  const plots = listPlots();

  // Enrich persons with plot details
  const enrichedPersons = pageItems.map((person) => ({
    ...person,
    plotsData: person.plots
      .map((plotId) => plots.find((p) => p.id === plotId))
      .filter((p): p is NonNullable<typeof p> => p !== undefined)
      .map((p) => ({
        id: p.id,
        plotNumber: p.plotNumber,
        sntStreetNumber: p.sntStreetNumber,
        cityAddress: p.cityAddress,
      })),
  }));

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <OfficeRegistryClient
          initialPersons={enrichedPersons}
          initialQuery={q ?? ""}
          initialStatus={verificationStatus ?? "all"}
          initialPage={page}
          initialTotal={total}
          limit={limit}
        />
      </div>
    </main>
  );
}
