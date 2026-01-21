import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { isAdminRole, isOfficeRole } from "@/lib/rbac";
import { listPersons, listPlots } from "@/lib/registry/core";
import RegistryTabsClient from "./RegistryTabsClient";
import AdminHelp from "../_components/AdminHelp";

export default async function RegistryPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/staff-login?next=/admin/registry");
  }

  const role = user.role;
  if (!isAdminRole(role) && !isOfficeRole(role)) {
    redirect("/forbidden?reason=admin.only&next=/admin/registry");
  }

  const params = (await searchParams) ?? {};
  const tab = typeof params.tab === "string" ? params.tab : "people";
  const q = typeof params.q === "string" ? params.q : undefined;
  const verificationStatus =
    typeof params.verificationStatus === "string"
      ? (params.verificationStatus as "not_verified" | "pending" | "verified" | "rejected")
      : undefined;

  // Load data for people tab
  const persons = listPersons({ q, verificationStatus: verificationStatus || undefined });
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Реестр СНТ</h1>
            <p className="mt-1 text-sm text-zinc-600">Управление данными участков и владельцев</p>
          </div>
        </div>
        <AdminHelp
          title="О реестре"
          content="Реестр содержит информацию о жителях и участках. Используйте вкладки для переключения между людьми, участками, импортом и проблемами данных. Для массового импорта используйте вкладку 'Импорт'."
        />
        <RegistryTabsClient
          initialTab={tab}
          initialPersons={enrichedPersons}
          initialQuery={q}
          initialVerificationStatus={verificationStatus}
        />
      </div>
    </main>
  );
}
