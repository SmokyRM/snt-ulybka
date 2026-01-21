import { redirect } from "next/navigation";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import BackToListLink from "@/components/BackToListLink";
import { getPerson, updatePerson, listPlots } from "@/lib/registry/core";
import { getInviteCodeByPersonId, createInviteCode, regenerateInviteCodeForPerson, revokeInviteCode } from "@/lib/registry/core/inviteCodes.store";
import { formatAdminTime } from "@/lib/settings.shared";
import PersonEditForm from "./PersonEditForm";
import PersonVerificationActions from "./PersonVerificationActions";
import PersonInviteCodeActions from "./PersonInviteCodeActions";

export default async function PersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) redirect("/staff-login?next=/admin/registry");

  const person = getPerson(id);
  if (!person) {
    return (
      <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Человек не найден</h1>
          <BackToListLink href="/admin/registry" />
        </div>
      </main>
    );
  }

  const plots = listPlots();
  const personPlots = person.plots
    .map((plotId) => plots.find((p) => p.id === plotId))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);

  const inviteCode = getInviteCodeByPersonId(id);

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{person.fullName}</h1>
          <BackToListLink href="/admin/registry" />
        </div>

        {/* Verification Status */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Статус подтверждения</h2>
          <div className="flex items-center gap-3">
            <span
              className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${
                person.verificationStatus === "verified"
                  ? "bg-green-100 text-green-800"
                  : person.verificationStatus === "rejected"
                    ? "bg-red-100 text-red-800"
                    : person.verificationStatus === "pending"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-zinc-100 text-zinc-800"
              }`}
            >
              {person.verificationStatus === "verified"
                ? "Подтверждено"
                : person.verificationStatus === "rejected"
                  ? "Отклонено"
                  : person.verificationStatus === "pending"
                    ? "На проверке"
                    : "Не проверено"}
            </span>
            <PersonVerificationActions person={person} />
          </div>
        </section>

        {/* Edit Form */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Редактирование данных</h2>
          <PersonEditForm person={person} />
        </section>

        {/* Plots */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Участки</h2>
          {personPlots.length === 0 ? (
            <p className="text-sm text-zinc-500">Нет привязанных участков</p>
          ) : (
            <div className="space-y-2">
              {personPlots.map((plot) => (
                <div key={plot.id} className="rounded border border-zinc-200 bg-zinc-50 p-3 text-sm">
                  <div className="font-medium">Линия {plot.sntStreetNumber}, участок {plot.plotNumber}</div>
                  {plot.cityAddress && <div className="text-zinc-600 mt-1">{plot.cityAddress}</div>}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Invite Code */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Код приглашения</h2>
          <PersonInviteCodeActions personId={id} inviteCode={inviteCode} />
        </section>

        {/* Metadata */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Метаданные</h2>
          <div className="grid gap-3 text-sm text-zinc-800 sm:grid-cols-2">
            <div>
              <p className="font-semibold">ID пользователя</p>
              <p className="font-mono text-xs">{person.userId || "—"}</p>
            </div>
            <div>
              <p className="font-semibold">Создано</p>
              <p>{formatAdminTime(person.createdAt)}</p>
            </div>
            <div>
              <p className="font-semibold">Обновлено</p>
              <p>{formatAdminTime(person.updatedAt)}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
