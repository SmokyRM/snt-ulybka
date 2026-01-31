import { redirect } from "next/navigation";

import { getCabinetHeaderInfo } from "../../../cabinet/_components/headerInfo";
import BalanceClient from "./BalanceClient";
import { getEffectiveSessionUser } from "@/lib/session.server";

export const dynamic = "force-dynamic";

export default async function CabinetBalancePage() {
  const session = await getEffectiveSessionUser();
  if (!session) {
    redirect("/login?next=/cabinet/balance");
  }
  if (session.role !== "resident") {
    redirect("/forbidden");
  }

  const headerInfo = await getCabinetHeaderInfo("Баланс");

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
      <BalanceClient headerInfo={headerInfo} />
    </main>
  );
}
