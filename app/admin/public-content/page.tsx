import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import {
  getPublicContent,
  resetPublicContent,
  savePublicContent,
} from "@/lib/publicContentStore";
import type { PublicContent } from "@/lib/publicContentDefaults";
import PublicContentEditorClient from "./PublicContentEditorClient";

export default async function AdminPublicContentPage() {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) redirect("/staff/login?next=/admin");

  const content = await getPublicContent();
  const canSave = process.env.NODE_ENV !== "production";

  async function saveAction(next: PublicContent) {
    "use server";
    const session = await getSessionUser();
    if (!hasAdminAccess(session)) redirect("/staff/login?next=/admin");

    const result = await savePublicContent(next);
    if (result.ok) {
      revalidatePath("/");
      revalidatePath("/documents");
      revalidatePath("/docs");
    }
    return result;
  }

  async function resetAction() {
    "use server";
    const session = await getSessionUser();
    if (!hasAdminAccess(session)) redirect("/staff/login?next=/admin");

    const result = await resetPublicContent();
    if (result.ok) {
      revalidatePath("/");
      revalidatePath("/documents");
      revalidatePath("/docs");
    }
    return result;
  }

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Публичные данные сайта</h1>
          <p className="text-sm text-zinc-600">
            Контакты, реквизиты, документы и FAQ для публичных страниц.
          </p>
          {!canSave ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
              Хранилище не настроено, изменения не сохраняются.
            </div>
          ) : null}
        </div>

        <PublicContentEditorClient
          initialContent={content}
          canSave={canSave}
          onSave={saveAction}
          onReset={resetAction}
        />
      </div>
    </main>
  );
}
