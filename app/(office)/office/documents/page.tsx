<<<<<<< HEAD
import Link from "next/link";
import { redirect } from "next/navigation";
import { listDocuments, togglePublish } from "@/lib/documents.store";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { removeDocumentAction } from "./actions";

const statuses = [
  { value: "all", label: "Все" },
  { value: "draft", label: "Черновики" },
  { value: "published", label: "Опубликованные" },
];

const categories = [
  { value: "all", label: "Все категории" },
  { value: "rules", label: "Правила" },
  { value: "templates", label: "Шаблоны" },
  { value: "reports", label: "Отчёты" },
  { value: "other", label: "Другое" },
];

async function publishAction(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  togglePublish(id);
}

export default async function OfficeDocumentsPage({
  searchParams,
}: {
  searchParams: { status?: string; category?: string; q?: string };
}) {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff-login?next=/office/documents");
  const rawRole = user.role as import("@/lib/rbac").Role | "user" | "board" | undefined;
  const { canAccess, getForbiddenReason } = await import("@/lib/rbac");
  const normalizedRole: import("@/lib/rbac").Role =
    rawRole === "user" || rawRole === "board"
      ? "resident"
      : rawRole ?? "guest";

  // Guard: office.access
  if (!canAccess(normalizedRole, "office.access")) {
    const reason = getForbiddenReason(normalizedRole, "office.access");
    redirect(`/forbidden?reason=${encodeURIComponent(reason)}&next=${encodeURIComponent("/office/documents")}`);
  }

  // UI permissions: write only for admin/chairman
  const canWriteDocs = normalizedRole === "admin" || normalizedRole === "chairman";

  const status = statuses.some((s) => s.value === searchParams.status) ? searchParams.status : "all";
  const category = categories.some((c) => c.value === searchParams.category) ? searchParams.category : "all";
  const q = searchParams.q?.trim() ?? "";
  const items = listDocuments({
    status: status === "all" ? undefined : (status as "draft" | "published"),
    category: category === "all" ? undefined : (category as "rules" | "templates" | "reports" | "other"),
    q,
  });

  return (
    <div className="space-y-4" data-testid="office-documents-root">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Документы</h1>
          <p className="text-sm text-zinc-600">Файлы и шаблоны для работы</p>
        </div>
        {canWriteDocs ? (
          <Link
            href="/office/documents/new"
            data-testid="office-documents-upload"
            className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4d5d41]"
          >
            Создать
          </Link>
        ) : null}
      </div>
      {!canWriteDocs ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" data-testid="office-documents-readonly-hint">
          Только просмотр
        </div>
      ) : null}

      <form className="flex flex-wrap gap-3 text-sm">
        <select
          name="status"
          defaultValue={status}
          data-testid="office-documents-filter-status"
          className="rounded-lg border border-zinc-200 px-3 py-2"
        >
          {statuses.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          name="category"
          defaultValue={category}
          data-testid="office-documents-filter-category"
          className="rounded-lg border border-zinc-200 px-3 py-2"
        >
          {categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          name="q"
          defaultValue={q}
          placeholder="Поиск"
          data-testid="office-documents-search"
          className="min-w-[220px] flex-1 rounded-lg border border-zinc-200 px-3 py-2"
        />
        <button
          type="submit"
          className="rounded-full border border-zinc-200 px-4 py-2 font-semibold text-[#5E704F] hover:border-[#5E704F]"
        >
          Фильтровать
        </button>
      </form>

      <div className="space-y-2" data-testid="office-documents-list">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-6 text-sm text-zinc-600">
            Документы пока не добавлены.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              data-testid={`office-documents-item-${item.id}`}
              className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-zinc-900">{item.title}</div>
                  <div className="text-xs text-zinc-500">
                    {new Date(item.updatedAt).toLocaleDateString("ru-RU")} · {item.category} · аудитория:{" "}
                    {item.visibility}
                  </div>
                  <div className="mt-2 text-sm text-zinc-700">{item.description ?? "Без описания"}</div>
                  {item.fileUrl ? (
                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid={`office-documents-filelink-${item.id}`}
                      className="text-sm font-semibold text-[#5E704F] hover:underline"
                    >
                      Скачать файл
                    </a>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-2 text-sm">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      item.status === "published"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    {item.status === "published" ? "Опубликовано" : "Черновик"}
                  </span>
                  {canWriteDocs ? (
                    <div className="flex flex-wrap gap-2">
                      <form action={publishAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <button
                          type="submit"
                          data-testid={`office-documents-publish-${item.id}`}
                          className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-[#5E704F] transition hover:border-[#5E704F]"
                        >
                          {item.status === "published" ? "Снять с публикации" : "Опубликовать"}
                        </button>
                      </form>
                      <form action={removeDocumentAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <button
                          type="submit"
                          className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:border-rose-300"
                        >
                          Удалить
                        </button>
                      </form>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
=======
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { can, type Role } from "@/lib/permissions";

export default async function OfficeDocumentsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/office/documents");
  const role = (user?.role as Role | undefined) ?? "resident";
  if (!can(role === "admin" ? "chairman" : role, "documents.manage")) {
    redirect("/forbidden");
  }
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h1 className="text-xl font-semibold text-zinc-900">Документы</h1>
      <p className="text-sm text-zinc-600">Раздел в разработке.</p>
>>>>>>> 737c5be (codex snapshot)
    </div>
  );
}
