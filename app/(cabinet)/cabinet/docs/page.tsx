import { readQaCabinetMockEnabled } from "@/lib/qaCabinetStage.server";
import type { QaCabinetMockData } from "../../../cabinet/_dev/qaMockData";
import { getQaCabinetMockData } from "../../../cabinet/_dev/qaMockData";
import { CabinetCard } from "../../../cabinet/_components/CabinetCard";
import { EmptyState } from "../../../cabinet/_components/EmptyState";
import { getCabinetHeaderInfo } from "../../../cabinet/_components/headerInfo";
import { CabinetHeader } from "../../../cabinet/_components/CabinetHeader";

export const dynamic = "force-dynamic";

export default async function CabinetDocsPage() {
  const mockEnabled = await readQaCabinetMockEnabled();
  const mock = mockEnabled ? getQaCabinetMockData() : null;
  const docs: QaCabinetMockData["requiredDocs"] = mock?.requiredDocs ?? [];
  const headerInfo = await getCabinetHeaderInfo("Документы");

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <CabinetHeader
          title="Документы"
          statusLine={headerInfo.statusLine}
          progressLabel={headerInfo.progressLabel}
          progressHref={headerInfo.progressHref}
        />

        <CabinetCard title="Список документов" subtitle="Последние обновления">
          {docs.length === 0 ? (
            <EmptyState
              title="Документы не найдены"
              description="Добавьте документы или включите QA mock."
              actionHref="/cabinet/help"
              actionLabel="Помощь"
            />
          ) : (
            <div className="space-y-2 text-sm text-zinc-800">
              {docs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
                  <a href={doc.url} className="text-[#5E704F] underline" target="_blank" rel="noreferrer">
                    {doc.title}
                  </a>
                  <span className="text-[11px] text-zinc-500">
                    {doc.acked ? "Подтверждено" : "Ознакомьтесь"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CabinetCard>
      </div>
    </main>
  );
}
