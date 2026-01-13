import { redirect } from "next/navigation";
import Link from "next/link";
import { listDocuments } from "@/lib/documents.store";
import { getSessionUser } from "@/lib/session.server";

export default async function CabinetDocumentsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/cabinet/documents");
  const items = listDocuments({ status: "published", visibility: "residents" });

  return (
    <div className="space-y-4" data-testid="cabinet-documents-root">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Документы</h1>
        <p className="text-sm text-zinc-600">Доступные публикации и шаблоны</p>
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
                  <div className="text-xs text-zinc-500">{new Date(item.updatedAt).toLocaleDateString("ru-RU")}</div>
                  <div className="mt-2 text-sm text-zinc-700 whitespace-pre-wrap">{item.description ?? "Без описания"}</div>
                  {item.fileUrl ? (
                    <a
                      href={item.fileUrl}
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
