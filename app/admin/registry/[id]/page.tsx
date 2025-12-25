import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/session.server";
import { findPlotById, listPersons } from "@/lib/mockDb";
import { formatAdminTime } from "@/lib/settings";

const formatMembership = (status?: string | null) => {
  switch (status) {
    case "MEMBER":
      return "Член";
    case "NON_MEMBER":
      return "Не член";
    case "PENDING":
      return "На проверке";
    default:
      return "—";
  }
};

const actionLabels: Record<string, string> = {
  update_plot: "Изменение данных участка",
  update_membership: "Изменение статуса членства",
  archive_plot: "Архивирование",
  unarchive_plot: "Возврат из архива",
  bulk_archive: "Массовое архивирование",
  bulk_unarchive: "Массовое восстановление",
  bulk_set_membership: "Массовое изменение членства",
  bulk_needs_review: "Массовая пометка на проверку",
};

export default async function RegistryDetail({
  params,
}: {
  params: { id: string };
}) {
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/login");
  const plot = findPlotById(params.id);
  if (!plot) {
    return (
      <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Участок не найден</h1>
          <Link href="/admin/registry" className="text-[#5E704F] underline">
            Вернуться к реестру
          </Link>
        </div>
      </main>
    );
  }
  const currentPlot = plot;
  const historyRes = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/api/admin/registry/plots/${currentPlot.id}/history`,
    { cache: "no-store" }
  ).catch(() => null);
  const historyJson = historyRes && historyRes.ok ? await historyRes.json() : { items: [] };
  const history = (historyJson.items as Array<{
    id: string;
    createdAtIso?: string;
    createdAtLocalFormatted?: string;
    action: string;
    entity?: string;
    entityId?: string | null;
    comment?: string | null;
    actorUserId?: string | null;
    actorRole?: string | null;
  }>) ?? [];

  async function updateStatus(formData: FormData) {
    "use server";
    const status = formData.get("status") as string;
    const membershipStatus = formData.get("membershipStatus") as string;
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/api/admin/registry/plots/${currentPlot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, membershipStatus }),
      cache: "no-store",
    });
    // no revalidate to keep minimal
  }

  async function changeOwner(formData: FormData) {
    "use server";
    const ownerId = formData.get("ownerId") as string;
    if (!ownerId) return;
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/api/admin/registry/plots/${currentPlot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerId }),
      cache: "no-store",
    });
  }

  const persons = listPersons();

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">
            Участок {currentPlot.street}, {currentPlot.plotNumber}
          </h1>
          <Link
            href="/admin/registry"
            className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
          >
            Назад
          </Link>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="grid gap-3 text-sm text-zinc-800 sm:grid-cols-2">
            <div>
              <p className="font-semibold">Улица</p>
              <p>{currentPlot.street}</p>
            </div>
            <div>
              <p className="font-semibold">Участок</p>
              <p>{currentPlot.plotNumber}</p>
            </div>
            <div>
              <p className="font-semibold">Членство</p>
              <p>{formatMembership(currentPlot.membershipStatus)}</p>
            </div>
            <div>
              <p className="font-semibold">Архив</p>
              <p>{currentPlot.status === "archived" ? "Да" : "Нет"}</p>
            </div>
            <div>
              <p className="font-semibold">Владелец</p>
              <p>{currentPlot.ownerFullName ?? "—"}</p>
            </div>
            <div>
              <p className="font-semibold">Обновлено</p>
              <p>{formatAdminTime(currentPlot.updatedAt)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">Изменить статус</h2>
          <form action={updateStatus} className="grid gap-3 text-sm sm:grid-cols-3 sm:items-end">
            <label className="flex flex-col gap-1">
              <span className="font-medium text-zinc-800">Статус</span>
              <select
                name="status"
                defaultValue={currentPlot.status ?? "active"}
                className="rounded border border-zinc-300 px-3 py-2"
              >
                <option value="active">Активен</option>
                <option value="archived">В архиве</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-medium text-zinc-800">Членство</span>
              <select
                name="membershipStatus"
                defaultValue={currentPlot.membershipStatus ?? "UNKNOWN"}
                className="rounded border border-zinc-300 px-3 py-2"
              >
                <option value="MEMBER">Член</option>
                <option value="NON_MEMBER">Не член</option>
                <option value="PENDING">На проверке</option>
                <option value="UNKNOWN">Не определено</option>
              </select>
            </label>
            <button
              type="submit"
              className="rounded bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4f5f42]"
            >
              Сохранить
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">Привязать владельца</h2>
          <form action={changeOwner} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-zinc-800">Владелец</span>
              <select name="ownerId" defaultValue="" className="rounded border border-zinc-300 px-3 py-2">
                <option value="">Не выбран</option>
                {persons.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} {p.phone ? `(${p.phone})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="rounded bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4f5f42]"
            >
              Сохранить владельца
            </button>
          </form>
          <p className="text-xs text-zinc-600">
            Для MVP список людей статический (persons), можно расширить позже формой создания.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold">История изменений</h2>
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-zinc-700">Дата</th>
                <th className="px-3 py-2 text-left font-semibold text-zinc-700">Действие</th>
                <th className="px-3 py-2 text-left font-semibold text-zinc-700">Комментарий</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {history.map((h) => (
                <tr key={h.id}>
                  <td className="px-3 py-2 text-zinc-700">
                    {h.createdAtLocalFormatted ?? formatAdminTime(h.createdAtIso ?? "")}
                  </td>
                  <td className="px-3 py-2 text-zinc-900">
                    {actionLabels[h.action as string] ?? h.action}
                  </td>
                  <td className="px-3 py-2 text-zinc-700">
                    {"comment" in h && h.comment ? h.comment : "—"}
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td className="px-3 py-3 text-center text-zinc-600" colSpan={3}>
                    История пуста
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
