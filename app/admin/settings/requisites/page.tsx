import Link from "next/link";
import { redirect } from "next/navigation";
import { getPaymentDetailsSettingServer, listSettingVersions, formatAdminTime } from "@/lib/settings.server";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { revalidatePath } from "next/cache";

export default async function AdminRequisitesHistory() {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) {
    redirect("/login?next=/admin");
  }
  const requisites = getPaymentDetailsSettingServer();
  const versions = listSettingVersions("requisites", "payment_details", 50);

  async function restoreVersion(formData: FormData) {
    "use server";
    const versionId = formData.get("versionId") as string;
    const comment = (formData.get("comment") as string) || "";
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/api/admin/settings/requisites/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ versionId, comment }),
      cache: "no-store",
    });
    revalidatePath("/admin/settings/requisites");
  }

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Реквизиты — история изменений</h1>
            <p className="text-sm text-zinc-600">
              Последнее обновление: {formatAdminTime(requisites.updatedAt)} (по местному времени)
            </p>
          </div>
          <Link
            href="/admin"
            className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
          >
            Назад в админку
          </Link>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Текущие реквизиты</h2>
          <pre className="mt-3 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-800">
{JSON.stringify(requisites.value, null, 2)}
          </pre>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-zinc-700">Версия</th>
                <th className="px-3 py-2 text-left font-semibold text-zinc-700">Дата</th>
                <th className="px-3 py-2 text-left font-semibold text-zinc-700">Актор</th>
                <th className="px-3 py-2 text-left font-semibold text-zinc-700">Комментарий</th>
                <th className="px-3 py-2 text-left font-semibold text-zinc-700">До</th>
                <th className="px-3 py-2 text-left font-semibold text-zinc-700">После</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {versions.map((v) => (
                <tr key={v.id} className="align-top">
                  <td className="px-3 py-2 font-semibold text-zinc-900">{v.version}</td>
                  <td className="px-3 py-2 text-zinc-700">{formatAdminTime(v.createdAt)}</td>
                  <td className="px-3 py-2 text-zinc-700">{v.actorUserId ?? "—"}</td>
                  <td className="px-3 py-2 text-zinc-700">{v.comment ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-zinc-700">
                    <pre className="whitespace-pre-wrap">
{JSON.stringify(v.before, null, 2)}
                    </pre>
                  </td>
                  <td className="px-3 py-2 text-xs text-zinc-700">
                    <pre className="whitespace-pre-wrap">
{JSON.stringify(v.after, null, 2)}
                    </pre>
                  </td>
                  <td className="px-3 py-2 text-xs text-zinc-700">
                    <form action={restoreVersion} className="flex flex-col gap-2">
                      <input type="hidden" name="versionId" value={v.id} />
                      <input
                        type="text"
                        name="comment"
                        placeholder="Комментарий"
                        className="w-full rounded border border-zinc-300 px-2 py-1 text-sm"
                      />
                      <button
                        type="submit"
                        className="rounded bg-[#5E704F] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#4f5f42]"
                      >
                        Восстановить
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {versions.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-center text-zinc-600" colSpan={7}>
                    История пока пуста
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
