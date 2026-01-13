import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { qaEnabled } from "@/lib/qaScenario";
import { getQaScenarioFromCookies, writeQaScenarioCookie } from "@/lib/qaScenario.server";
import QaClearButton from "../_components/QaClearButton";

export const metadata = {
  title: "QA-инструменты — СНТ «Улыбка»",
  alternates: { canonical: "/admin/qa" },
};

export default async function QaPage() {
  const session = await getSessionUser();
  if (!session || (session.role !== "admin" && session.role !== "board")) {
    redirect("/login?next=/admin/qa");
  }
  if (!qaEnabled()) {
    redirect("/admin");
  }

  const cookieStore = await cookies();
  const current = await getQaScenarioFromCookies(cookieStore);

  async function clearScenario() {
    "use server";
    await writeQaScenarioCookie(null);
  }

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-8 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="font-semibold">QA-режим (только dev)</div>
            {current ? (
              <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-semibold text-amber-900">
                Активен: {current}
              </span>
            ) : null}
            {current ? (
              <form action={clearScenario}>
                <button
                  type="submit"
                  className="rounded-full border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-900 hover:border-amber-400"
                >
                  Сбросить сценарий
                </button>
              </form>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-amber-800">
            Сценарии меняют только отображение в тестовом окружении и не затрагивают реальные данные.
          </p>
        </div>

        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#5E704F]">QA</p>
          <h1 className="text-2xl font-semibold">Инструменты тестирования</h1>
          <p className="text-sm text-zinc-700">
            Доступно только в dev/staging и только для admin/board. Сценарий хранится в cookie.
          </p>
          <div className="text-xs text-zinc-500">Текущий сценарий: {current ?? "не задан"}</div>
        </header>


        <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-zinc-900">Роль офиса (QA)</div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link
              href="/office?qa=chairman"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="qa-open-office-chairman"
              className="rounded-full border border-zinc-200 px-4 py-2 font-semibold text-[#5E704F] hover:border-[#5E704F]"
            >
              Председатель
            </Link>
            <Link
              href="/office?qa=accountant"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="qa-open-office-accountant"
              className="rounded-full border border-zinc-200 px-4 py-2 font-semibold text-[#5E704F] hover:border-[#5E704F]"
            >
              Бухгалтер
            </Link>
            <Link
              href="/office?qa=secretary"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="qa-open-office-secretary"
              className="rounded-full border border-zinc-200 px-4 py-2 font-semibold text-[#5E704F] hover:border-[#5E704F]"
            >
              Секретарь
            </Link>
            <form action={clearScenario}>
              <button
                type="submit"
                data-testid="qa-reset-admin"
                className="rounded-full border border-amber-300 px-4 py-2 font-semibold text-amber-900 hover:border-amber-400"
              >
                Сбросить (админ)
              </button>
            </form>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-zinc-900">Открыть</div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link
              href="/office"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="qa-open-office"
              className="rounded-full border border-zinc-200 px-4 py-2 font-semibold text-[#5E704F] hover:border-[#5E704F]"
            >
              Офис
            </Link>
            <Link
              href="/cabinet"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="qa-open-cabinet"
              className="rounded-full border border-zinc-200 px-4 py-2 font-semibold text-[#5E704F] hover:border-[#5E704F]"
            >
              Кабинет
            </Link>
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="qa-open-guest"
              className="rounded-full border border-zinc-200 px-4 py-2 font-semibold text-[#5E704F] hover:border-[#5E704F]"
            >
              Гость (главная)
            </Link>
            <Link
              href="/admin"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="qa-open-admin"
              className="rounded-full border border-zinc-200 px-4 py-2 font-semibold text-[#5E704F] hover:border-[#5E704F]"
            >
              Админка
            </Link>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-zinc-900">Сервис</div>
          <QaClearButton />
        </section>

      </div>
    </main>
  );
}
