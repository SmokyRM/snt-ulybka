import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import ConfirmPaymentClient from "./ConfirmPaymentClient";

export const dynamic = "force-dynamic";

export default async function CabinetPaymentConfirmPage() {
  const session = await getEffectiveSessionUser();

  if (!session) {
    redirect("/login?next=/cabinet/payments/confirm");
  }

  if (session.role !== "resident") {
    redirect("/forbidden");
  }

  const plotNumber = session.plotNumber || null;

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
      <ConfirmPaymentClient plotNumber={plotNumber} />
    </main>
  );
}
