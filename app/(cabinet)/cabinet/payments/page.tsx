import { Suspense } from "react";
import { redirect } from "next/navigation";
import { readQaCabinetMockEnabled } from "@/lib/qaCabinetStage.server";
import { getQaCabinetMockData } from "../../../cabinet/_dev/qaMockData";
import { getCabinetHeaderInfo } from "../../../cabinet/_components/headerInfo";
import { LoadingState } from "../../../cabinet/_components/LoadingState";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { getUserFinanceHistory } from "@/lib/financeHistory";
import PaymentsClient from "./PaymentsClient";
import HowToPayClient from "./HowToPayClient";

export const dynamic = "force-dynamic";

export default async function CabinetPaymentsPage() {
  const session = await getEffectiveSessionUser();
  if (!session) {
    redirect("/login?next=/cabinet/payments");
  }
  if (session.role !== "resident") {
    redirect("/forbidden");
  }
  const mockEnabled = await readQaCabinetMockEnabled();
  const mock = mockEnabled ? getQaCabinetMockData() : null;
  const headerInfo = await getCabinetHeaderInfo("Взносы");
  const history = await getUserFinanceHistory(session.id, 12);

  const totalCharged = history.reduce((sum, item) => sum + (item.charged ?? 0), 0);
  const totalPaid = history.reduce((sum, item) => sum + (item.paid ?? 0), 0);
  const balance = totalPaid - totalCharged;
  const debt = Math.max(0, totalCharged - totalPaid);
  const overpay = Math.max(0, totalPaid - totalCharged);
  const lastPaidEntry = history.find((item) => item.paid > 0);

  const data =
    history.length > 0
      ? {
          summary: {
            debt,
            overpay,
            balance,
            lastPayment: lastPaidEntry ? `${lastPaidEntry.month}-15T00:00:00.000Z` : null,
          },
          accruals: history.map((item) => ({
            id: `acc-${item.month}`,
            period: item.month,
            description: "Начисления за период",
            amount: item.charged,
            status: item.paid >= item.charged ? "paid" : "unpaid",
            dueDate: `${item.month}-28T00:00:00.000Z`,
          })),
          payments: history
            .filter((item) => item.paid > 0)
            .map((item) => ({
              id: `pay-${item.month}`,
              date: `${item.month}-15T00:00:00.000Z`,
              amount: item.paid,
              method: "Онлайн",
              comment: item.paid >= item.charged ? "Оплачено полностью" : "Частичная оплата",
            })),
          years: Array.from(new Set(history.map((item) => Number(item.month.slice(0, 4))))).sort((a, b) => b - a),
        }
      : null;

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
      <Suspense fallback={<LoadingState lines={6} />}>
        <PaymentsClient mockEnabled={mockEnabled} mock={mock} headerInfo={headerInfo} data={data} />
      </Suspense>
      <div className="mx-auto mt-4 max-w-5xl">
        <Suspense fallback={<LoadingState lines={4} />}>
          <HowToPayClient />
        </Suspense>
      </div>
    </main>
  );
}
