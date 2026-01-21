import { redirect } from "next/navigation";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import ContentSettingsClient from "./ContentSettingsClient";

export default async function ContentSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/staff-login?next=/admin/settings/content");
  }
  
  if (!hasAdminAccess(user)) {
    redirect("/forbidden?reason=admin.only&next=/admin/settings/content");
  }

  const params = (await searchParams) ?? {};
  const saved = typeof params.saved === "string";

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Настройки контента</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Реквизиты, контакты, каналы связи и публичные страницы
            </p>
          </div>
          <a
            href="/admin"
            className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
          >
            Назад
          </a>
        </div>
        {saved && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            Сохранено
          </div>
        )}
        <ContentSettingsClient />
      </div>
    </main>
  );
}
