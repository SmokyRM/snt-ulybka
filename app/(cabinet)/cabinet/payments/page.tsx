import { Suspense } from "react";
import { readQaCabinetMockEnabled } from "@/lib/qaCabinetStage.server";
import { getQaCabinetMockData } from "../../../cabinet/_dev/qaMockData";
import { getCabinetHeaderInfo } from "../../../cabinet/_components/headerInfo";
import { LoadingState } from "../../../cabinet/_components/LoadingState";
import PaymentsClient from "./PaymentsClient";

export const dynamic = "force-dynamic";

export default async function CabinetPaymentsPage() {
  const mockEnabled = await readQaCabinetMockEnabled();
  const mock = mockEnabled ? getQaCabinetMockData() : null;
  const headerInfo = await getCabinetHeaderInfo("Взносы");

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
      <Suspense fallback={<LoadingState lines={6} />}>
        <PaymentsClient mockEnabled={mockEnabled} mock={mock} headerInfo={headerInfo} />
      </Suspense>
    </main>
  );
}
