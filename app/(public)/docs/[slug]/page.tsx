import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { getDocumentBySlug } from "@/lib/documentsStore";
import { listKnowledgeArticles } from "@/lib/knowledgeStore";

type Params = {
  params: { slug: string };
};

const normalizeRole = (
  role?: string | null,
): "guest" | "user" | "board" | "admin" | "chair" => {
  if (role === "admin") return "admin";
  if (role === "board") return "board";
  if (role === "chair") return "chair";
  if (role === "user") return "user";
  return "guest";
};

const hasAccess = (
  audience: Array<"guest" | "user" | "board" | "chair" | "admin">,
  role: ReturnType<typeof normalizeRole>,
) => {
  if (role === "admin") return true;
  if (role === "board" || role === "chair") {
    return audience.some((a) => ["board", "chair", "user", "guest"].includes(a));
  }
  if (role === "user") {
    return audience.some((a) => ["user", "guest"].includes(a));
  }
  return audience.includes("guest");
};

const formatAudience = (audience: Array<"guest" | "user" | "board" | "chair" | "admin">) => {
  const map: Record<string, string> = {
    guest: "Гости",
    user: "Жители",
    board: "Правление",
    chair: "Правление",
    admin: "Админ",
  };
  return audience.map((a) => map[a] ?? a).join(", ");
};

const formatFileMeta = (mime: string | null, size: number | null) => {
  if (!mime || !size) return "";
  const label =
    mime === "application/pdf"
      ? "PDF"
      : mime === "image/png"
        ? "PNG"
        : mime === "image/jpeg"
          ? "JPG"
          : mime === "image/webp"
            ? "WEBP"
            : mime.toUpperCase();
  const kb = Math.round(size / 102.4) / 10;
  const value = kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(1)} KB`;
  return `${label} • ${value}`;
};

export default async function DocumentPage({ params }: Params) {
  const user = await getSessionUser();
  const role = normalizeRole(user?.role);
  const document = await getDocumentBySlug(params.slug);
  if (!document) notFound();
  const relatedArticles = (await listKnowledgeArticles())
    .filter((article) => article.published !== false)
    .filter((article) => article.documentSlugs.includes(document.slug))
    .sort((a, b) => a.title.localeCompare(b.title))
    .slice(0, 3);
  const allowed = hasAccess(document.audience, role);
  const audienceLabel = formatAudience(document.audience);
  const isGuest = role === "guest";

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="text-xs text-zinc-500">
          <Link href="/docs" className="hover:text-[#5E704F] hover:underline">
            Документы
          </Link>{" "}
          → {document.title}
        </div>

        <header className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-[#5E704F]">
            {document.category}
          </div>
          <h1 className="text-2xl font-semibold text-zinc-900">{document.title}</h1>
          {document.description ? (
            <p className="text-sm text-zinc-700">{document.description}</p>
          ) : null}
          <div className="text-xs text-zinc-500">Доступно: {audienceLabel}</div>
        </header>

        {!allowed ? (
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-700 shadow-sm">
            <div className="font-semibold text-zinc-900">Нет доступа</div>
            <p className="mt-2">
              Этот документ доступен только для: {audienceLabel}.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {isGuest ? (
                <Link
                  href="/login"
                  className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-[#5E704F] hover:text-[#5E704F]"
                >
                  Войти
                </Link>
              ) : null}
              <Link
                href="/contacts"
                className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-[#5E704F] hover:text-[#5E704F]"
              >
                Контакты
              </Link>
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-700 shadow-sm">
            {document.fileUrl ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-zinc-500">Файл</div>
                  <div className="text-sm font-semibold text-zinc-900">
                    {formatFileMeta(document.mime, document.size)}
                  </div>
                </div>
                <a
                  href={document.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex rounded-full border border-[#5E704F] px-4 py-2 text-xs font-semibold text-[#5E704F] transition hover:bg-[#5E704F]/10"
                >
                  Открыть
                </a>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="font-semibold text-zinc-900">Документ готовится</div>
                <p className="text-sm text-zinc-600">
                  Мы готовим файл. Если документ нужен срочно — свяжитесь с правлением.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/contacts"
                    className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-[#5E704F] hover:text-[#5E704F]"
                  >
                    Контакты
                  </Link>
                  <Link
                    href={isGuest ? "/login" : "/cabinet?section=appeals"}
                    className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-[#5E704F] hover:text-[#5E704F]"
                  >
                    Написать обращение
                  </Link>
                </div>
              </div>
            )}
          </section>
        )}

        {relatedArticles.length > 0 ? (
          <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-700 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-900">Связанные статьи</h2>
            <div className="mt-3 space-y-2">
              {relatedArticles.map((article) => (
                <Link
                  key={article.slug}
                  href={`/knowledge/${article.slug}`}
                  className="block text-sm font-semibold text-[#5E704F] underline"
                >
                  {article.title}
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
