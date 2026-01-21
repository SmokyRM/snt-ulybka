import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { listTemplates, createTemplate, updateTemplate, deleteTemplate } from "@/lib/templates.store";
import type { AppealStatus } from "@/lib/office/types";

export default async function AdminTemplatesPage() {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) {
    redirect("/staff/login?next=/admin/templates");
  }

  // Sprint 5.4: RBAC - только admin/chairman
  if (!user || (user.role !== "admin" && user.role !== "chairman")) {
    redirect("/forbidden?reason=admin.only");
  }

  const templates = listTemplates();

  async function createAction(formData: FormData) {
    "use server";
    const session = await getSessionUser();
    if (!session || !hasAdminAccess(session) || (session.role !== "admin" && session.role !== "chairman")) {
      redirect("/forbidden");
    }

    const key = (formData.get("key") as string | null)?.trim() ?? "";
    const title = (formData.get("title") as string | null)?.trim() ?? "";
    const body = (formData.get("body") as string | null)?.trim() ?? "";
    const allowedRolesStr = (formData.get("allowedRoles") as string | null)?.trim() ?? "";
    const setStatus = (formData.get("setStatus") as string | null) || undefined;
    const assignRole = (formData.get("assignRole") as string | null) || undefined;
    const addComment = formData.get("addComment") === "on";

    if (!key || !title || !body) {
      return;
    }

    const allowedRoles = allowedRolesStr
      ? allowedRolesStr.split(",").map((r) => r.trim()).filter(Boolean)
      : [];

    try {
      createTemplate({
        key,
        title,
        body,
        allowedRoles,
        actions: {
          ...(setStatus && { setStatus: setStatus as AppealStatus }),
          ...(assignRole && {
            assignRole: assignRole as "chairman" | "secretary" | "accountant" | "admin",
          }),
          ...(addComment && { addComment: true }),
        },
      });
      revalidatePath("/admin/templates");
    } catch (error) {
      console.error("[admin/templates] Create error:", error);
    }
  }

  async function updateAction(formData: FormData) {
    "use server";
    const session = await getSessionUser();
    if (!session || !hasAdminAccess(session) || (session.role !== "admin" && session.role !== "chairman")) {
      redirect("/forbidden");
    }

    const id = (formData.get("id") as string | null) ?? "";
    const key = (formData.get("key") as string | null)?.trim();
    const title = (formData.get("title") as string | null)?.trim();
    const body = (formData.get("body") as string | null)?.trim();
    const allowedRolesStr = (formData.get("allowedRoles") as string | null)?.trim();
    const setStatus = (formData.get("setStatus") as string | null) || undefined;
    const assignRole = (formData.get("assignRole") as string | null) || undefined;
    const addComment = formData.get("addComment") === "on";

    if (!id) return;

    try {
      const updateData: Parameters<typeof updateTemplate>[1] = {};
      if (key !== null) updateData.key = key;
      if (title !== null) updateData.title = title;
      if (body !== null) updateData.body = body;
      if (allowedRolesStr !== null && allowedRolesStr !== undefined) {
        updateData.allowedRoles = allowedRolesStr
          .split(",")
          .map((r) => r.trim())
          .filter(Boolean);
      }
      if (setStatus || assignRole || addComment) {
        updateData.actions = {
          ...(setStatus && { setStatus: setStatus as AppealStatus }),
          ...(assignRole && {
            assignRole: assignRole as "chairman" | "secretary" | "accountant" | "admin",
          }),
          ...(addComment && { addComment: true }),
        };
      }

      updateTemplate(id, updateData);
      revalidatePath("/admin/templates");
    } catch (error) {
      console.error("[admin/templates] Update error:", error);
    }
  }

  async function deleteAction(formData: FormData) {
    "use server";
    const session = await getSessionUser();
    if (!session || !hasAdminAccess(session) || (session.role !== "admin" && session.role !== "chairman")) {
      redirect("/forbidden");
    }

    const id = (formData.get("id") as string | null) ?? "";
    if (!id) return;

    try {
      deleteTemplate(id);
      revalidatePath("/admin/templates");
    } catch (error) {
      console.error("[admin/templates] Delete error:", error);
    }
  }

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Шаблоны действий</h1>
            <p className="text-sm text-zinc-600">Управление шаблонами для обращений</p>
          </div>
          <Link
            href="/admin"
            className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
          >
            Назад
          </Link>
        </div>

        {/* Форма создания */}
        <form action={createAction} className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-zinc-800">Создать шаблон</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-zinc-800">
              Ключ (unique)
              <input
                name="key"
                required
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                placeholder="request_info"
              />
            </label>
            <label className="block text-sm font-semibold text-zinc-800">
              Название
              <input
                name="title"
                required
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                placeholder="Запросить уточнение"
              />
            </label>
          </div>
          <label className="block text-sm font-semibold text-zinc-800">
            Текст шаблона
            <textarea
              name="body"
              rows={4}
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              placeholder="Текст комментария..."
            />
          </label>
          <label className="block text-sm font-semibold text-zinc-800">
            Разрешенные роли (через запятую)
            <input
              name="allowedRoles"
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              placeholder="secretary,chairman,admin"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm font-semibold text-zinc-800">
              Установить статус
              <select name="setStatus" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm">
                <option value="">Не менять</option>
                <option value="new">Новое</option>
                <option value="in_progress">В работе</option>
                <option value="needs_info">Требует уточнения</option>
                <option value="closed">Закрыто</option>
              </select>
            </label>
            <label className="block text-sm font-semibold text-zinc-800">
              Назначить роль
              <select name="assignRole" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm">
                <option value="">Не назначать</option>
                <option value="chairman">Председатель</option>
                <option value="secretary">Секретарь</option>
                <option value="accountant">Бухгалтер</option>
                <option value="admin">Админ</option>
              </select>
            </label>
            <label className="flex items-center gap-2 pt-6">
              <input type="checkbox" name="addComment" className="rounded border-zinc-300" />
              <span className="text-sm font-semibold text-zinc-800">Добавить комментарий</span>
            </label>
          </div>
          <button
            type="submit"
            className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4d5d41]"
          >
            Создать
          </button>
        </form>

        {/* Список шаблонов */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Существующие шаблоны</h2>
          {templates.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
              Шаблонов пока нет
            </div>
          ) : (
            templates.map((template) => (
              <form key={template.id} action={updateAction} className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <input type="hidden" name="id" value={template.id} />
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-zinc-800">Редактировать шаблон</div>
                  <form action={deleteAction}>
                    <input type="hidden" name="id" value={template.id} />
                    <button
                      type="submit"
                      className="rounded-full border border-red-300 px-3 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                    >
                      Удалить
                    </button>
                  </form>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-zinc-800">
                    Ключ
                    <input
                      name="key"
                      defaultValue={template.key}
                      required
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm font-semibold text-zinc-800">
                    Название
                    <input
                      name="title"
                      defaultValue={template.title}
                      required
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    />
                  </label>
                </div>
                <label className="block text-sm font-semibold text-zinc-800">
                  Текст шаблона
                  <textarea
                    name="body"
                    rows={4}
                    defaultValue={template.body}
                    required
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm font-semibold text-zinc-800">
                  Разрешенные роли (через запятую)
                  <input
                    name="allowedRoles"
                    defaultValue={template.allowedRoles.join(",")}
                    required
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="block text-sm font-semibold text-zinc-800">
                    Установить статус
                    <select
                      name="setStatus"
                      defaultValue={template.actions.setStatus || ""}
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    >
                      <option value="">Не менять</option>
                      <option value="new">Новое</option>
                      <option value="in_progress">В работе</option>
                      <option value="needs_info">Требует уточнения</option>
                      <option value="closed">Закрыто</option>
                    </select>
                  </label>
                  <label className="block text-sm font-semibold text-zinc-800">
                    Назначить роль
                    <select
                      name="assignRole"
                      defaultValue={template.actions.assignRole || ""}
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    >
                      <option value="">Не назначать</option>
                      <option value="chairman">Председатель</option>
                      <option value="secretary">Секретарь</option>
                      <option value="accountant">Бухгалтер</option>
                      <option value="admin">Админ</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      name="addComment"
                      defaultChecked={template.actions.addComment}
                      className="rounded border-zinc-300"
                    />
                    <span className="text-sm font-semibold text-zinc-800">Добавить комментарий</span>
                  </label>
                </div>
                <button
                  type="submit"
                  className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4d5d41]"
                >
                  Сохранить
                </button>
              </form>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
