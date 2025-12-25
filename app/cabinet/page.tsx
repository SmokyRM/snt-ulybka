import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import { getSessionUser } from "@/lib/session.server";

export default async function CabinetPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Личный кабинет</h1>
          <LogoutButton
            redirectTo="/"
            className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-60"
            busyLabel="Выходим..."
          />
        </div>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Статус</h2>
          <p className="mt-2 text-sm text-zinc-700">
            Статус участка: не подтверждён.
          </p>
          <p className="mt-2 text-sm text-zinc-600">
            Подтверждение собственности будет доступно позже. Пока используйте разделы
            оплаты и справки.
          </p>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Быстрые действия</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <Link
              href="/fees"
              className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-[#5E704F] transition-colors hover:border-[#5E704F]/50"
            >
              Оплатить взносы
            </Link>
            <Link
              href="/electricity"
              className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-[#5E704F] transition-colors hover:border-[#5E704F]/50"
            >
              Электроэнергия
            </Link>
            <Link
              href="/contacts"
              className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-[#5E704F] transition-colors hover:border-[#5E704F]/50"
            >
              Контакты правления
            </Link>
            <Link
              href="/cabinet/tickets"
              className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-[#5E704F] transition-colors hover:border-[#5E704F]/50"
            >
              Обращения
              <span className="mt-1 block text-xs font-normal text-zinc-600">
                Создавайте обращения и отслеживайте статус.
              </span>
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Уведомления</h2>
          <p className="mt-2 text-sm text-zinc-700">Пока уведомлений нет.</p>
          <p className="mt-2 text-sm text-zinc-600">
            Здесь будут появляться начисления, сроки и важные объявления.
          </p>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Обращения</h2>
          <p className="mt-2 text-sm text-zinc-700">Форма обращений появится позже.</p>
          <p className="mt-2 text-sm text-zinc-600">
            Пока что можно написать через контакты правления.
          </p>
          <div className="mt-3">
            <Link
              href="/contacts"
              className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:border-zinc-400"
            >
              Перейти к контактам
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
