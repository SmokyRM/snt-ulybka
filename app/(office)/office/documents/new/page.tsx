import { redirect } from "next/navigation";
import { createDocument } from "@/lib/documents.store";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { saveFile } from "@/lib/fileVault.server";

async function createAction(formData: FormData) {
  "use server";
  const title = ((formData.get("title") as string | null) ?? "").trim();
  const description = ((formData.get("description") as string | null) ?? "").trim();
  const category = (formData.get("category") as "rules" | "templates" | "reports" | "other") ?? "other";
  const visibility = (formData.get("visibility") as "all" | "residents" | "staff") ?? "all";
  const authorRole = (formData.get("authorRole") as string | null) ?? "chairman";
  const file = formData.get("file") as File | null;
  let fileId: string | undefined;
  let fileName: string | undefined;
  let fileUrl: string | undefined;
  if (file && typeof file === "object" && file.size > 0) {
    const saved = await saveFile(file);
    fileId = saved.id;
    fileName = saved.fileName;
    fileUrl = `/api/files/${saved.id}`;
  }
  if (!title) return;
  createDocument({ title, description, category, visibility, authorRole, fileId, fileName, fileUrl });
  redirect("/office/documents");
}

export default async function OfficeDocumentNew() {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff-login?next=/office/documents/new");
  const role = (user.role as Role | undefined) ?? "resident";
  if (!(role === "chairman" || role === "secretary" || role === "admin")) {
    redirect("/forbidden");
  }

  return (
    <div className="space-y-4" data-testid="office-documents-new-root">
      <h1 className="text-2xl font-semibold text-zinc-900">Новый документ</h1>
      <form action={createAction} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <input type="hidden" name="authorRole" value={role} />
        <label className="block space-y-2 text-sm font-semibold text-zinc-900">
          Заголовок
          <input
            name="title"
            required
            minLength={3}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#5E704F]"
            placeholder="Название документа"
          />
        </label>
        <label className="block space-y-2 text-sm font-semibold text-zinc-900">
          Описание
          <textarea
            name="description"
            rows={4}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#5E704F]"
            placeholder="Короткое описание"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2 text-sm font-semibold text-zinc-900">
            Категория
            <select
              name="category"
              defaultValue="other"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#5E704F]"
            >
              <option value="rules">Правила</option>
              <option value="templates">Шаблоны</option>
              <option value="reports">Отчёты</option>
              <option value="other">Другое</option>
            </select>
          </label>
          <label className="block space-y-2 text-sm font-semibold text-zinc-900">
            Доступ
            <select
              name="visibility"
              defaultValue="all"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#5E704F]"
            >
              <option value="all">Все</option>
              <option value="residents">Жители</option>
              <option value="staff">Сотрудники</option>
            </select>
          </label>
        </div>
        <label className="block space-y-2 text-sm font-semibold text-zinc-900">
          Файл (опционально)
          <input
            type="file"
            name="file"
            data-testid="office-documents-upload"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#5E704F]"
          />
        </label>
        <button
          type="submit"
          data-testid="office-documents-new-submit"
          className="rounded-full bg-[#5E704F] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#4d5d41]"
        >
          Создать
        </button>
      </form>
    </div>
  );
}
