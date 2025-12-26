import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/session.server";
import {
  approveMembershipRequest,
  getMembershipRequests,
  rejectMembershipRequest,
} from "@/lib/membership";

async function approve(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/login");
  const id = (formData.get("id") as string | null) ?? "";
  if (id) await approveMembershipRequest(id);
  redirect("/admin/membership-requests");
}

async function reject(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/login");
  const id = (formData.get("id") as string | null) ?? "";
  if (id) await rejectMembershipRequest(id);
  redirect("/admin/membership-requests");
}

export default async function MembershipRequestsPage() {
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/login");

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
                  <div>Участок: {req.plotNumber}</div>
                  <div>Улица: {req.street || "—"}</div>
                  <div>Комментарий: {req.comment || "—"}</div>
                </div>
                <div className="mt-3 flex gap-2">
                  <form action={approve}>
                    <input type="hidden" name="id" value={req.id} />
                    <button
                      type="submit"
                      className="rounded-full bg-[#5E704F] px-3 py-2 text-xs font-semibold text-white hover:bg-[#4d5d40]"
                    >
                      Подтвердить
                    </button>
                  </form>
                  <form action={reject}>
                    <input type="hidden" name="id" value={req.id} />
                    <button
                      type="submit"
                      className="rounded-full border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:border-red-400"
                    >
                      Отклонить
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
