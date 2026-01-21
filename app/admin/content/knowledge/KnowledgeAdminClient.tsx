"use client";

import { useMemo, useState } from "react";
import type { KnowledgeArticle } from "@/lib/knowledge/seed";
import type { DocumentRecord } from "@/lib/documentsStore";
import { readOk } from "@/lib/api/client";

type Props = {
  initialArticles: KnowledgeArticle[];
  documents: DocumentRecord[];
};

const emptyDraft = (): KnowledgeArticle => ({
  slug: "",
  title: "",
  summary: "",
  category: "Общее",
  content: "",
  tags: [],
  updatedAt: new Date().toISOString().slice(0, 10),
  documentSlugs: [],
  published: true,
});

export default function KnowledgeAdminClient({ initialArticles, documents }: Props) {
  const [articles, setArticles] = useState<KnowledgeArticle[]>(initialArticles);
  const [draft, setDraft] = useState<KnowledgeArticle>(emptyDraft());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const tagString = useMemo(() => draft.tags.join(", "), [draft.tags]);

  const handleEdit = (article: KnowledgeArticle) => {
    setDraft(article);
    setMessage(null);
  };

  const handleSave = async () => {
    if (!draft.slug.trim() || !draft.title.trim()) {
      setMessage("Нужны slug и заголовок.");
      return;
    }
    setLoading(true);
    setMessage(null);
    const payload = {
      ...draft,
      slug: draft.slug.trim(),
      title: draft.title.trim(),
      summary: draft.summary.trim(),
      category: draft.category.trim() || "Общее",
      published: Boolean(draft.published),
    };
    try {
      const exists = articles.some((item) => item.slug === payload.slug);
      const res = await fetch(exists ? `/api/admin/knowledge/${payload.slug}` : "/api/admin/knowledge", {
        method: exists ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await readOk<{ article: KnowledgeArticle }>(res);
      setArticles((prev) => {
        const hasItem = prev.some((item) => item.slug === json.article.slug);
        if (hasItem) {
          return prev.map((item) => (item.slug === json.article.slug ? json.article : item));
        }
        return [json.article, ...prev];
      });
      setDraft(json.article);
      setMessage("Сохранено.");
    } catch {
      setMessage("Не удалось сохранить статью.");
    } finally {
      setLoading(false);
    }
  };

  const toggleDocument = (slug: string) => {
    setDraft((prev) => {
      const exists = prev.documentSlugs.includes(slug);
      const next = exists
        ? prev.documentSlugs.filter((item) => item !== slug)
        : [...prev.documentSlugs, slug];
      return { ...prev, documentSlugs: next };
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Статьи</h2>
          <span className="text-xs text-zinc-500">Всего: {articles.length}</span>
        </div>
        <div className="mt-4 space-y-3">
          {articles.length === 0 ? (
            <div className="text-sm text-zinc-500">Статей пока нет.</div>
          ) : (
            articles.map((article) => (
              <button
                type="button"
                key={article.slug}
                onClick={() => handleEdit(article)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-3 text-left text-sm transition hover:border-[#5E704F]/50"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-zinc-900">{article.title}</div>
                  <div className="text-xs text-zinc-500">
                    Документы: {article.documentSlugs.length}
                  </div>
                </div>
                <div className="text-xs text-zinc-500">
                  {article.category} · {article.published ? "Опубликовано" : "Черновик"}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Редактор</h2>
        <div className="mt-4 space-y-3 text-sm text-zinc-700">
          <label className="block">
            Slug
            <input
              value={draft.slug}
              onChange={(event) => setDraft((prev) => ({ ...prev, slug: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              placeholder="например, fees-and-payments"
            />
          </label>
          <label className="block">
            Заголовок
            <input
              value={draft.title}
              onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            Категория
            <input
              value={draft.category}
              onChange={(event) => setDraft((prev) => ({ ...prev, category: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            Краткое описание
            <textarea
              value={draft.summary}
              onChange={(event) => setDraft((prev) => ({ ...prev, summary: event.target.value }))}
              rows={2}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            Теги (через запятую)
            <input
              value={tagString}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  tags: event.target.value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                }))
              }
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            Текст статьи
            <textarea
              value={draft.content}
              onChange={(event) => setDraft((prev) => ({ ...prev, content: event.target.value }))}
              rows={6}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={Boolean(draft.published)}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, published: event.target.checked }))
              }
            />
            Опубликовано
          </label>
          <div>
            <div className="text-sm font-semibold text-zinc-900">Документы по теме</div>
            <div className="mt-2 space-y-2 text-xs text-zinc-600">
              {documents.length === 0 ? (
                <div>Документов пока нет.</div>
              ) : (
                documents.map((doc) => (
                  <label key={doc.slug} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={draft.documentSlugs.includes(doc.slug)}
                      onChange={() => toggleDocument(doc.slug)}
                    />
                    <span>{doc.title}</span>
                    <span className="text-[11px] text-zinc-400">{doc.slug}</span>
                  </label>
                ))
              )}
            </div>
          </div>
          {message && <div className="text-xs text-zinc-600">{message}</div>}
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="w-full rounded-full bg-[#5E704F] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#4d5d41] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Сохраняем..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}
