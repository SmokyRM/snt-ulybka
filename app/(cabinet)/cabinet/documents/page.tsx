import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { listResidentDocuments } from "@/lib/office/documentAccess.server";

export default async function CabinetDocumentsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/cabinet/documents");
  const items = await listResidentDocuments(user.id);

  return (
    <div className="space-y-4" data-testid="cabinet-documents-root">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Документы</h1>
        <p className="text-sm text-zinc-600">Доступные публикации и шаблоны</p>
        <div className="mt-3">
          <a
            href="/api/cabinet/documents/no-debt.pdf"
            className="inline-flex items-center rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Сгенерировать справку по расчетам (PDF)
          </a>
        </div>
      </div>
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-6 text-sm text-zinc-600">
            Документов пока нет.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              data-testid={`cabinet-documents-item-${item.id}`}
              className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-zinc-900">{item.title}</div>
                  <div className="text-xs text-zinc-500">{new Date(item.uploadedAt).toLocaleDateString("ru-RU")}</div>
                  <div className="mt-2 text-sm text-zinc-700 whitespace-pre-wrap">
                    {item.period ? `Период: ${item.period}` : "Документ доступен для скачивания"}
                  </div>
                  {item.fileUrl ? (
                    <a
                      href={`/api/cabinet/documents/${item.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid={`cabinet-documents-filelink-${item.id}`}
                      className="text-sm font-semibold text-[#5E704F] hover:underline"
                    >
                      Скачать файл
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
