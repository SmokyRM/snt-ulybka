import Link from "next/link";
import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { listMyOwnerships } from "@/lib/residentsRegistry.store";

export const metadata = {
  title: "Проверка доступа — Личный кабинет",
};

const statusLabel = (status: string) => {
  if (status === "verified") return "Подтверждено";
  if (status === "pending") return "На проверке";
  if (status === "rejected") return "Отклонено";
  if (status === "conflict") return "Конфликт (участок уже закреплён)";
  return status;
};

export default async function CabinetVerificationPage() {
  const user = await getEffectiveSessionUser();
  if (!user || (user.role !== "resident" && user.role !== "user" && user.role !== "admin")) {
    redirect("/login?next=/cabinet/verification");
  }

  const residentId = user.id;
  const ownerships = listMyOwnerships(residentId);
  const verified = ownerships.filter((o) => o.ownership.status === "verified");
  const pending = ownerships.filter(
    (o) => o.ownership.status === "pending" || o.ownership.status === "rejected" || o.ownership.status === "conflict",
  );

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6" data-testid="cabinet-verification-root">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header className="space-y-2">
          <div className="text-xs text-zinc-500">
            <Link href="/cabinet" className="hover:text-[#5E704F] hover:underline">
              Личный кабинет
            </Link>{" "}
            → Проверка доступа
          </div>
          <h1 className="text-2xl font-semibold">Проверка участков</h1>
          <p className="text-sm text-zinc-600">
            Здесь видно статус подтверждения участков. Если участка нет — отправьте запрос.
          </p>
          <Link
            href="/cabinet/link-plot"
            className="inline-flex text-sm font-semibold text-[#5E704F] hover:underline"
          >
            Отправить запрос на участок →
          </Link>
        </header>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Мои участки</div>
          {verified.length === 0 ? (
            <div className="mt-3 text-sm text-zinc-700">Подтверждённых участков пока нет.</div>
          ) : (
            <ul className="mt-3 space-y-2">
              {verified.map(({ ownership, plot }) => (
                <li
                  key={ownership.id}
                  data-testid={`cabinet-verification-item-${ownership.id}`}
                  className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
                >
                  Улица {plot.streetNo}, участок {plot.plotLabel} —{" "}
                  <span data-testid={`cabinet-verification-status-${ownership.id}`} className="font-semibold">
                    {statusLabel(ownership.status)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Мои заявки</div>
          {pending.length === 0 ? (
            <div className="mt-3 text-sm text-zinc-700">Заявок на подтверждение пока нет.</div>
          ) : (
            <ul className="mt-3 space-y-2">
              {pending.map(({ ownership, plot }) => (
                <li
                  key={ownership.id}
                  data-testid={`cabinet-verification-item-${ownership.id}`}
                  className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm text-zinc-800"
                >
                  Улица {plot.streetNo}, участок {plot.plotLabel} —{" "}
                  <span
                    data-testid={`cabinet-verification-status-${ownership.id}`}
                    className="font-semibold"
                  >
                    {statusLabel(ownership.status)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
