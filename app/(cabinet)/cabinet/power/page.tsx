import { readQaCabinetMockEnabled } from "@/lib/qaCabinetStage.server";
import type { QaCabinetMockData } from "../../../cabinet/_dev/qaMockData";
import { getQaCabinetMockData } from "../../../cabinet/_dev/qaMockData";
import { CabinetCard } from "../../../cabinet/_components/CabinetCard";
import { EmptyState } from "../../../cabinet/_components/EmptyState";
import { getCabinetHeaderInfo } from "../../../cabinet/_components/headerInfo";
import { CabinetHeader } from "../../../cabinet/_components/CabinetHeader";

export const dynamic = "force-dynamic";

export default async function CabinetPowerPage() {
  const mockEnabled = await readQaCabinetMockEnabled();
  const mock = mockEnabled ? getQaCabinetMockData() : null;
  const history: QaCabinetMockData["electricityHistory"] = mock?.electricityHistory ?? [];
  const headerInfo = await getCabinetHeaderInfo("Электроэнергия");

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <CabinetHeader
          title="Электроэнергия"
          statusLine={headerInfo.statusLine}
          progressLabel={headerInfo.progressLabel}
          progressHref={headerInfo.progressHref}
        />

        <CabinetCard title="Последние показания" subtitle="История">
          {history.length === 0 ? (
            <EmptyState
              title="Нет показаний"
              description="Передайте показания или включите QA mock."
              actionHref="/cabinet"
              actionLabel="На главную"
            />
          ) : (
            <div className="space-y-2 text-sm text-zinc-800">
              {history.map((h) => (
                <div key={h.date} className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
                  <span>{h.month}</span>
                  <span className="font-semibold">{h.reading}</span>
                </div>
              ))}
            </div>
          )}
        </CabinetCard>
      </div>
    </main>
  );
}
