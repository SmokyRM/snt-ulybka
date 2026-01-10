import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { listDocuments } from "@/lib/documentsStore";
import { getArticleBySlug } from "@/lib/knowledge";

type Params = {
  params: { slug: string };
};

const renderContent = (content: string) => {
  const blocks = content.split(/\n{2,}/);
  return blocks.map((block, index) => {
    const trimmed = block.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("## ")) {
      return (
        <h2 key={`h2-${index}`} className="text-lg font-semibold text-zinc-900">
          {trimmed.replace(/^##\s+/, "")}
        </h2>
      );
    }
    if (trimmed.startsWith("# ")) {
      return (
        <h1 key={`h1-${index}`} className="text-xl font-semibold text-zinc-900">
          {trimmed.replace(/^#\s+/, "")}
        </h1>
      );
    }
    const lines = trimmed.split("\n");
    const isList = lines.every((line) => line.trim().startsWith("-"));
    if (isList) {
      return (
        <ul key={`ul-${index}`} className="list-disc space-y-1 pl-5 text-sm text-zinc-700">
          {lines.map((line) => (
            <li key={`${index}-${line}`}>{line.replace(/^-+\s*/, "")}</li>
          ))}
        </ul>
      );
    }
    return (
      <p key={`p-${index}`} className="text-sm text-zinc-700">
        {trimmed}
      </p>
    );
  });
};

export const metadata = {
  title: "Статья — СНТ «Улыбка»",
  alternates: {
    canonical: "/knowledge",
  },
};

export default async function KnowledgeArticlePage({ params }: Params) {
  const user = await getSessionUser();
  const role =
    user?.role === "admin" || user?.role === "board" || user?.role === "user"
      ? user.role
      : "guest";
  const article = await getArticleBySlug(params.slug);
  if (!article) notFound();
  const allDocs = await listDocuments();
  const availableDocs = allDocs.filter(
    (doc) => article.documentSlugs.includes(doc.slug) && doc.audience.includes(role),
  );

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="text-xs text-zinc-500">
          <Link href="/knowledge" className="hover:text-[#5E704F] hover:underline">
            База знаний
          </Link>{" "}
          → {article.title}
        </div>

        <header className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-[#5E704F]">
            {article.category}
          </div>
          <h1 className="text-2xl font-semibold text-zinc-900">{article.title}</h1>
          <p className="text-sm text-zinc-600">{article.summary}</p>
          <div className="text-xs text-zinc-500">
            Обновлено: {new Date(article.updatedAt).toLocaleDateString("ru-RU")}
          </div>
        </header>

        <article className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          {renderContent(article.content)}
        </article>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Документы по теме</h2>
          {availableDocs.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-600">
              Документы по теме недоступны для текущего уровня доступа.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {availableDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3"
                >
                  <div>
                    <div className="text-sm font-semibold text-zinc-900">{doc.title}</div>
                    {!doc.fileUrl && (
                      <div className="text-xs text-zinc-600">Документ готовится.</div>
                    )}
                  </div>
                  {doc.fileUrl ? (
                    <Link
                      href={doc.fileUrl}
                      className="inline-flex rounded-full border border-[#5E704F] px-4 py-2 text-xs font-semibold text-[#5E704F] transition-colors hover:bg-[#5E704F]/10"
                    >
                      Открыть
                    </Link>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href="/contacts"
                        className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-[#5E704F] hover:text-[#5E704F]"
                      >
                        Контакты
                      </Link>
                      <Link
                        href="/cabinet?section=appeals"
                        className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-[#5E704F] hover:text-[#5E704F]"
                      >
                        Написать обращение
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
