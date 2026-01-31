import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import ConfirmationsListClient from "./ConfirmationsListClient";

export const dynamic = "force-dynamic";

export default async function CabinetPaymentConfirmationsPage() {
  const session = await getEffectiveSessionUser();

  if (!session) {
    redirect("/login?next=/cabinet/payments/confirmations");
  }

  if (session.role !== "resident") {
    redirect("/forbidden");
  }

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
      <ConfirmationsListClient />
    </main>
  );
}
