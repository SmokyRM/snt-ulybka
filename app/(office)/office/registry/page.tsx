import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { isAdminRole, isOfficeRole } from "@/lib/rbac";
import OfficeRegistryClient from "./OfficeRegistryClient";
import { listPersons, listPlots } from "@/lib/registry/core";

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

  const persons = listPersons({ q });
  const plots = listPlots();

  // Enrich persons with plot details
  const enrichedPersons = persons.map((person) => ({
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
        <OfficeRegistryClient initialPersons={enrichedPersons} initialQuery={q} />
      </div>
    </main>
  );
}
