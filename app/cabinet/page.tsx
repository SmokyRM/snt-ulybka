import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import { getSessionUser, SessionUser } from "@/lib/session.server";
import { getPlotForUser } from "@/lib/plotsDb";

export default async function CabinetPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/auth");
  }

  const status = (user.status as SessionUser["status"]) ?? "pending";
  const isVerified = status === "verified";
  const plot = user.id ? getPlotForUser(user.id) : null;

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Личный кабинет</h1>
            <p className="text-sm text-zinc-600">
              {user.email || user.phone || user.contact || "Профиль"}
            </p>
          </div>
          <LogoutButton
            redirectTo="/"
            className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-60"
            busyLabel="Выходим..."
          />
        </div>

        {isVerified ? (
          <section className="rounded-2xl border border-[#5E704F]/30 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-[#5E704F]/10 px-3 py-1 text-xs font-semibold text-[#5E704F]">
                Доступ открыт
              </span>
              <p className="text-sm text-zinc-600">
                Правление подтвердило ваши данные.
              </p>
            </div>
            <h2 className="mt-3 text-xl font-semibold text-zinc-900">
              Полный кабинет
            </h2>
            {plot ? (
              <ul className="mt-4 space-y-2 text-sm text-zinc-700">
                <li>
                  Мой участок: {plot.street}, {plot.plotNumber}
                </li>
                {plot.cadastral && <li>Кадастровый номер: {plot.cadastral}</li>}
                <li>Код участка: {plot.plotCode}</li>
              </ul>
            ) : (
              <p className="mt-4 text-sm text-zinc-700">
                Данные участка будут доступны после обновления реестра.
              </p>
            )}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link
                href="/"
                className="block rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-[#5E704F] transition-colors hover:border-[#5E704F]/50"
              >
                Новости
              </Link>
              <Link
                href="/#docs"
                className="block rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-[#5E704F] transition-colors hover:border-[#5E704F]/50"
              >
                Документы
              </Link>
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                {status === "rejected" ? "Отклонено" : "На проверке"}
              </span>
              <p className="text-sm text-zinc-700">
                {status === "rejected"
                  ? "Доступ отклонен"
                  : "На проверке правлением"}
              </p>
            </div>
            <p className="mt-3 text-sm text-zinc-700">
              {status === "rejected"
                ? "Свяжитесь с правлением для уточнения причин и повторной заявки."
                : "Доступ ограничен до подтверждения данных правлением."}
            </p>
            {status === "rejected" && (
              <p className="mt-2 text-sm text-zinc-700">
                Контакты правления: info@snt-ulybka.ru, +7 (900) 000-00-00
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/register-plot"
                className="rounded-full bg-[#5E704F] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41]"
              >
                Изменить заявку
              </Link>
              <Link
                href="/"
                className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:border-zinc-400"
              >
                Новости и документы
              </Link>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
