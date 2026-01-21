import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { assertCan, isStaffOrAdmin } from "@/lib/rbac";
import type { Role } from "@/lib/permissions";
import { createTemplate } from "@/server/services/templates";
import AppLink from "@/components/AppLink";

export default async function OfficeTemplateNewPage() {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff/login?next=/office/templates/new");
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    redirect("/forbidden?reason=office.only&next=/office");
  }

  try {
    assertCan(role, "templates.manage", undefined);
  } catch {
    redirect("/forbidden?reason=office.only&next=/office");
  }

  async function create(formData: FormData) {
    "use server";
    const session = await getEffectiveSessionUser();
    if (!session) redirect("/staff/login?next=/office/templates/new");
    const sessionRole = (session.role as Role | undefined) ?? "resident";
    try {
      assertCan(sessionRole, "templates.manage", undefined);
    } catch {
      redirect("/forbidden");
    }
    const title = String(formData.get("title") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();
    const category = String(formData.get("category") ?? "").trim();
    if (!title || !content) return;
    
    try {
      const created = await createTemplate({
        title,
        content,
        category: category || undefined,
      });
      revalidatePath("/office/templates");
      redirect(`/office/templates/${created.id}/edit`);
    } catch {
      redirect("/office/templates");
    }
  }

  return (
    <div className="space-y-4" data-testid="template-editor">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Новый шаблон</h1>
          <p className="text-sm text-zinc-600">Создайте шаблон для ответов на обращения</p>
        </div>
        <AppLink
          href="/office/templates"
          className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-[#5E704F]"
        >
          Назад
        </AppLink>
      </div>

      <form action={create} className="space-y-3 rounded-2xl border border-zinc-200 bg-white px-4 py-5 shadow-sm" data-testid="template-editor">
        <div className="space-y-1">
          <label className="text-sm font-semibold text-zinc-800" htmlFor="title">
            Название
          </label>
          <input
            id="title"
            name="title"
            required
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#5E704F]"
            placeholder="Например: Ответ по начислениям"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold text-zinc-800" htmlFor="category">
            Категория (необязательно)
          </label>
          <input
            id="category"
            name="category"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#5E704F]"
            placeholder="Например: Начисления"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold text-zinc-800" htmlFor="content">
            Текст шаблона
          </label>
          <textarea
            id="content"
            name="content"
            rows={8}
            required
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#5E704F]"
            placeholder="Введите текст шаблона..."
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#4b5b40]"
          >
            Создать
          </button>
          <AppLink
            href="/office/templates"
            className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-[#5E704F]"
          >
            Отмена
          </AppLink>
        </div>
      </form>
    </div>
  );
}
