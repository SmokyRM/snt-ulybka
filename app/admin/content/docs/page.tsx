import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { listDocuments } from "@/lib/documentsStore";
import DocsManagerClient from "./DocsManagerClient";

export default async function AdminDocsContentPage() {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) {
    redirect("/login?next=/admin/content/docs");
  }
  const documents = await listDocuments();

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Контент: документы</h1>
            <p className="text-sm text-zinc-600">
              Управляйте списком документов и их доступностью.
            </p>
          </div>
          <Link
            href="/admin"
            className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
          >
            Назад
          </Link>
        </div>

        <DocsManagerClient initialDocs={documents} />
      </div>
    </main>
  );
}
