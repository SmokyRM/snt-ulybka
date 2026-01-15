import { redirect } from "next/navigation";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import {
  getMembershipRequests,
  updateMembershipRequestStatus,
  type MembershipRequestStatus,
} from "@/lib/membership";

async function updateStatus(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) redirect("/staff/login?next=/admin");
  const id = (formData.get("id") as string | null) ?? "";
  const status = (formData.get("status") as MembershipRequestStatus | null) ?? "new";
  const comment = (formData.get("comment") as string | null) ?? null;
  if (id) {
    await updateMembershipRequestStatus({ id, status, comment });
  }
  redirect("/admin/membership-requests");
}

export default async function MembershipRequestsPage() {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) redirect("/staff/login?next=/admin");

  const requests = await getMembershipRequests();
  const newRequests = requests.filter((r) => r.status === "new");

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Заявки на подтверждение членства</h1>
          <span className="rounded-full bg-[#2F3827]/10 px-3 py-1 text-xs font-semibold text-[#2F3827]">
            Только для админов
          </span>
        </div>

        {newRequests.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 shadow-sm">
            Новых заявок нет.
          </div>
        ) : (
          <div className="space-y-3">
            {newRequests.map((req) => (
              <div key={req.id} className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-800 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold text-zinc-900">{req.fullName}</div>
                  <div className="text-xs text-zinc-600">{new Date(req.createdAt).toLocaleString("ru-RU")}</div>
                </div>
                <div className="mt-2 grid gap-1 text-sm text-zinc-700 sm:grid-cols-2">
                  <div>Телефон: {req.phone}</div>
                  <div>Документ: {req.proofType || "—"}</div>
                  <div>Комментарий: {req.comment || "—"}</div>
                </div>
                <div className="mt-2 text-sm text-zinc-700">
                  <div className="font-semibold text-zinc-900">Участки</div>
                  {req.plots && req.plots.length > 0 ? (
                    <ul className="mt-1 space-y-1">
                      {req.plots.map((p, idx) => (
                        <li key={`${req.id}-${idx}`} className="text-zinc-800">
                          {(p.street || "—")}, уч. {p.plotNumber}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div>Участок: {req.plotNumber || "—"}, улица: {req.street || "—"}</div>
                  )}
                </div>
                <form action={updateStatus} className="mt-3 space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <input type="hidden" name="id" value={req.id} />
                  <label className="text-xs text-zinc-700">
                    Статус
                    <select
                      name="status"
                      defaultValue={req.status}
                      className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                    >
                      <option value="new">На проверке</option>
                      <option value="needs_info">Нужны уточнения</option>
                      <option value="approved">Подтверждено</option>
                      <option value="rejected">Отклонено</option>
                    </select>
                  </label>
                  <label className="text-xs text-zinc-700">
                    Комментарий
                    <textarea
                      name="comment"
                      defaultValue={req.comment ?? ""}
                      className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                      rows={2}
                      placeholder="Комментарий правления"
                    />
                  </label>
                  <button
                    type="submit"
                    className="rounded-full bg-[#5E704F] px-3 py-2 text-xs font-semibold text-white hover:bg-[#4d5d40]"
                  >
                    Сохранить
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
