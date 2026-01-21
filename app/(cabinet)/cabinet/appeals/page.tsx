import { readQaCabinetMockEnabled } from "@/lib/qaCabinetStage.server";
import type { QaCabinetMockData } from "../../../cabinet/_dev/qaMockData";
import { getQaCabinetMockData } from "../../../cabinet/_dev/qaMockData";
import { CabinetCard } from "../../../cabinet/_components/CabinetCard";
import { EmptyState } from "../../../cabinet/_components/EmptyState";
import { getCabinetHeaderInfo } from "../../../cabinet/_components/headerInfo";
import { CabinetHeader } from "../../../cabinet/_components/CabinetHeader";

export const dynamic = "force-dynamic";

export default async function CabinetAppealsPage() {
  const mockEnabled = await readQaCabinetMockEnabled();
  const mock = mockEnabled ? getQaCabinetMockData() : null;
  const appeals: QaCabinetMockData["appeals"] = mock?.appeals ?? [];
  const headerInfo = await getCabinetHeaderInfo("Обращения");

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <CabinetHeader
          title="Обращения"
          statusLine={headerInfo.statusLine}
          progressLabel={headerInfo.progressLabel}
          progressHref={headerInfo.progressHref}
        />

        <CabinetCard title="Мои обращения" subtitle="Последние заявки" actionHref="/cabinet" actionLabel="На главную">
          {appeals.length === 0 ? (
            <EmptyState
              title="Обращений пока нет"
              description="Создайте обращение или включите QA mock."
              actionHref="/cabinet"
              actionLabel="Создать"
            />
          ) : (
            <div className="space-y-2 text-sm text-zinc-800">
              {appeals.map((a) => (
                <div key={a.id} className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{a.status}</span>
                    <span className="text-[11px] text-zinc-500">
                      {new Date(a.createdAt).toLocaleDateString("ru-RU")}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-700">{a.message}</p>
                </div>
              ))}
            </div>
          )}
        </CabinetCard>
      </div>
    </main>
  );
}
