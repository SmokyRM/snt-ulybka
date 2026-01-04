import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import {
  getOwnershipVerificationById,
  setOwnershipVerificationStatus,
  getPlots,
} from "@/lib/plots";
import { getUserProfile } from "@/lib/userProfiles";

async function approveVerification(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) {
    redirect("/login?next=/admin/verifications");
  }
  const id = (formData.get("id") as string | null) ?? "";
  if (!id) {
    redirect("/admin/verifications?status=sent");
  }
  await setOwnershipVerificationStatus({
    id,
    status: "approved",
  });
  redirect("/admin/verifications?status=sent&updated=1");
}

async function rejectVerification(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) {
    redirect("/login?next=/admin/verifications");
  }
  const id = (formData.get("id") as string | null) ?? "";
  const note = ((formData.get("reviewNote") as string | null) ?? "").trim();
  if (!id || !note) {
    redirect(`/admin/verifications/${encodeURIComponent(id)}?error=note`);
  }
  await setOwnershipVerificationStatus({
    id,
    status: "rejected",
    reviewNote: note,
  });
  redirect("/admin/verifications?status=sent&updated=1");
}

export default async function VerificationDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) {
    redirect("/login?next=/admin/verifications");
  }
  const verification = await getOwnershipVerificationById(params.id);
  if (!verification) {
    notFound();
  }
  const profile = await getUserProfile(verification.userId);
  const plots = await getPlots();
  const normalized = verification.cadastralNumber.trim().toLowerCase();
  const plot = plots.find((p) => (p.cadastral || "").trim().toLowerCase() === normalized) ?? null;
  const createdAt = new Date(verification.createdAt).toLocaleString("ru-RU");
  const reviewedAt = verification.reviewedAt
    ? new Date(verification.reviewedAt).toLocaleString("ru-RU")
    : "—";
  const error = typeof searchParams?.error === "string" ? searchParams.error : null;

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Заявка на подтверждение</h1>
          <Link
            href="/admin/verifications?status=sent"
            className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
          >
            Назад
          </Link>
        </div>

        {error === "note" ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            Укажите причину отклонения.
          </div>
        ) : null}

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 text-sm text-zinc-700 sm:grid-cols-2">
            <div>
              <div className="text-xs uppercase text-zinc-400">Заявитель</div>
              <div className="mt-1 text-sm font-semibold text-zinc-900">
                {profile.fullName || profile.phone || "Пользователь"}
              </div>
              <div className="text-xs text-zinc-600">Телефон: {profile.phone || "—"}</div>
              <div className="text-xs text-zinc-600">Почта: {profile.email || "—"}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-zinc-400">Участок</div>
              <div className="mt-1 text-sm font-semibold text-zinc-900">
                {plot ? `${plot.street} ${plot.plotNumber}` : "Не найден в реестре"}
              </div>
              <div className="text-xs text-zinc-600">Кадастровый: {verification.cadastralNumber}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-zinc-400">Статус</div>
              <div className="mt-1 text-sm font-semibold text-zinc-900">{verification.status}</div>
              <div className="text-xs text-zinc-600">Создано: {createdAt}</div>
              <div className="text-xs text-zinc-600">Проверено: {reviewedAt}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-zinc-400">Документ</div>
              <div className="mt-1 text-sm text-zinc-700">{verification.documentMeta?.name || "—"}</div>
              <div className="text-xs text-zinc-600">{verification.documentMeta?.type || "—"}</div>
            </div>
          </div>
          {verification.reviewNote ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Причина: {verification.reviewNote}
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <form action={approveVerification} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <input type="hidden" name="id" value={verification.id} />
            <div className="text-sm font-semibold text-emerald-900">Подтвердить</div>
            <p className="mt-1 text-xs text-emerald-800">Откроет доступ и подтвердит участок.</p>
            <button
              type="submit"
              className="mt-3 rounded-full bg-[#5E704F] px-4 py-2 text-xs font-semibold text-white"
            >
              Подтвердить
            </button>
          </form>

          <form action={rejectVerification} className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <input type="hidden" name="id" value={verification.id} />
            <div className="text-sm font-semibold text-rose-900">Отклонить</div>
            <label className="mt-2 block text-xs text-rose-800">
              Причина
              <textarea
                name="reviewNote"
                required
                rows={3}
                className="mt-1 w-full rounded border border-rose-200 bg-white px-3 py-2 text-xs text-zinc-800"
              />
            </label>
            <button
              type="submit"
              className="mt-3 rounded-full border border-rose-300 bg-white px-4 py-2 text-xs font-semibold text-rose-800"
            >
              Отклонить
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
