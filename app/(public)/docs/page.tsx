import DocumentsClient from "./DocumentsClient";
import { getPublicContent } from "@/lib/publicContentStore";

export const dynamic = "force-dynamic";

export default async function DocsPage() {
  const content = await getPublicContent();
  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Документы СНТ «Улыбка»</h1>
          <p className="text-sm text-zinc-700">
            Официальные документы товарищества, протоколы собраний и шаблоны заявлений.
          </p>
        </div>
        <DocumentsClient categories={content.documentsByCategory} />
      </div>
    </main>
  );
}
