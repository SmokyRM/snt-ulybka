import { notFound } from "next/navigation";
import { readQaCabinetMockEnabled } from "@/lib/qaCabinetStage.server";
import { getQaCabinetStageFromCookies } from "@/lib/qaCabinetStage.server";
import CabinetLabPanel from "./_components/CabinetLabPanel";
import CabinetStageRenderer from "../../../cabinet/_components/CabinetStageRenderer";

export const dynamic = "force-dynamic";

export default async function CabinetLabPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const stage = await getQaCabinetStageFromCookies();
  const mocksEnabled = await readQaCabinetMockEnabled();

  return (
    <div className="space-y-4">
      <div className="text-2xl font-semibold text-zinc-900">Cabinet Lab (DEV)</div>
      <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
        <div className="relative">
          <div className="sticky top-4">
            <CabinetLabPanel currentStage={stage} mocksEnabled={mocksEnabled} />
          </div>
        </div>
        <div className="min-h-[70vh] rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <CabinetStageRenderer stageOverride={stage ?? null} isLabPreview={true} />
        </div>
      </div>
    </div>
  );
}
