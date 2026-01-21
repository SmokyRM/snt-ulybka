import { redirect } from "next/navigation";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import TariffOverridesClient from "./TariffOverridesClient";
import { findFeeTariffById, listFeeTariffOverrides, listPlots } from "@/lib/mockDb";

export default async function TariffOverridesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/staff-login?next=/admin/billing/fee-tariffs");
  }
  if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
    redirect("/forbidden?reason=finance.access&next=/admin/billing/fee-tariffs");
  }

  const { id } = await params;
  const tariff = findFeeTariffById(id);
  if (!tariff) {
    redirect("/admin/billing/fee-tariffs");
  }

  const overrides = listFeeTariffOverrides({ tariffId: id });
  const plots = listPlots();

  return <TariffOverridesClient tariff={tariff} initialOverrides={overrides} plots={plots} />;
}
