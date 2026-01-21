import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { assertCan, isStaffOrAdmin, can } from "@/lib/rbac";
import type { Role } from "@/lib/permissions";
import { listTemplates, deleteTemplate } from "@/server/services/templates";
import AppLink from "@/components/AppLink";
import DeleteTemplateButton from "./DeleteTemplateButton";

export default async function OfficeTemplatesPage() {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff/login?next=/office/templates");
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    redirect("/forbidden?reason=office.only&next=/office");
  }

  try {
    assertCan(role, "templates.read", undefined);
  } catch {
    redirect("/forbidden?reason=office.only&next=/office");
  }

  const canManage = can(role, "templates.manage", undefined);

  let templates;
  try {
    templates = await listTemplates();
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      redirect("/staff/login?next=/office/templates");
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      redirect("/forbidden?reason=office.only&next=/office");
    }
    throw error;
  }

  async function deleteAction(formData: FormData) {
    "use server";
    const session = await getEffectiveSessionUser();
    if (!session) redirect("/staff/login?next=/office/templates");
    const sessionRole = (session.role as Role | undefined) ?? "resident";
    try {
      assertCan(sessionRole, "templates.manage", undefined);
    } catch {
      redirect("/forbidden");
    }
    const id = formData.get("id");
    if (typeof id !== "string") return;
    try {
      await deleteTemplate(id);
      revalidatePath("/office/templates");
    } catch {
      // Игнорируем ошибки
    }
  }

  return (
    <div className="space-y-4" data-testid="office-templates-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Шаблоны</h1>
          <p className="text-sm text-zinc-600">Шаблоны ответов для обращений</p>
        </div>
        {canManage && (
          <AppLink
            href="/office/templates/new"
            className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#4b5b40]"
          >
            Новый шаблон
          </AppLink>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm" data-testid="office-templates-list">
        {templates.length === 0 ? (
          <div className="px-4 py-6 text-sm text-zinc-600">
            {canManage ? "Пока нет шаблонов. Создайте первый шаблон." : "Нет доступных шаблонов."}
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <AppLink
                      href={`/office/templates/${template.id}/edit`}
                      className="text-base font-semibold text-zinc-900 hover:text-[#5E704F]"
                    >
                      {template.title}
                    </AppLink>
                    {template.category && (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                        {template.category}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-600 line-clamp-2">{template.content}</p>
                  <div className="text-xs text-zinc-500">
                    Обновлено: {new Date(template.updatedAt).toLocaleString("ru-RU")}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canManage && (
                    <>
                      <AppLink
                        href={`/office/templates/${template.id}/edit`}
                        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:border-[#5E704F]"
                      >
                        Редактировать
                      </AppLink>
                      <DeleteTemplateButton deleteAction={deleteAction} templateId={template.id} />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
