import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import QaCleanerClient from "../_components/QaCleanerClient";
import { getSessionUser } from "@/lib/session.server";
import { qaEnabled, type QaScenario } from "@/lib/qaScenario";
import {
  getQaScenarioFromCookies,
  writeQaScenarioCookie,
} from "@/lib/qaScenario.server";

const qaOptions: QaScenario[] = [
  "guest",
  "resident_ok",
  "resident_debtor",
  "admin",
  "chairman",
  "accountant",
  "secretary",
];

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

  async function setScenario(formData: FormData) {
    "use server";
    const value = (formData.get("scenario") as string | null) as QaScenario | null;
    if (value && qaOptions.includes(value)) {
      await writeQaScenarioCookie(value);
    } else {
      await writeQaScenarioCookie(null);
    }
  }

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
          <div className="text-sm font-semibold text-zinc-900">Открыть в новом окне</div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link
              href="/cabinet?qa=resident_ok"
              target="_blank"
              className="rounded-full border border-zinc-200 px-4 py-2 font-semibold text-[#5E704F] hover:border-[#5E704F]"
            >
              Житель (без долга)
            </Link>
            <Link
              href="/cabinet?qa=resident_debtor"
              target="_blank"
              className="rounded-full border border-zinc-200 px-4 py-2 font-semibold text-[#5E704F] hover:border-[#5E704F]"
            >
              Житель (должник)
            </Link>
            <Link
              href="/cabinet/announcements"
              target="_blank"
              className="rounded-full border border-zinc-200 px-4 py-2 font-semibold text-[#5E704F] hover:border-[#5E704F]"
            >
              Объявления
            </Link>
            <Link
              href="/cabinet/templates"
              target="_blank"
              className="rounded-full border border-zinc-200 px-4 py-2 font-semibold text-[#5E704F] hover:border-[#5E704F]"
            >
              Шаблоны
            </Link>
            <Link
              href="/office"
              target="_blank"
              className="rounded-full border border-zinc-200 px-4 py-2 font-semibold text-[#5E704F] hover:border-[#5E704F]"
            >
              Офис
            </Link>
            <Link
              href="/?qa=guest"
              target="_blank"
              className="rounded-full border border-zinc-200 px-4 py-2 font-semibold text-[#5E704F] hover:border-[#5E704F]"
            >
              Гость (главная)
            </Link>
            <Link
              href="/login"
              target="_blank"
              className="rounded-full border border-zinc-200 px-4 py-2 font-semibold text-[#5E704F] hover:border-[#5E704F]"
            >
              Логин
            </Link>
            <Link
              href="/admin"
              target="_blank"
              className="rounded-full border border-zinc-200 px-4 py-2 font-semibold text-[#5E704F] hover:border-[#5E704F]"
            >
              Админка
            </Link>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-zinc-900">Открыть офис как роль</div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link
              href="/office?qa=chairman"
              target="_blank"
              className="rounded-full border border-zinc-200 px-4 py-2 font-semibold text-[#5E704F] hover:border-[#5E704F]"
            >
              Председатель
            </Link>
            <Link
              href="/office?qa=accountant"
              target="_blank"
              className="rounded-full border border-zinc-200 px-4 py-2 font-semibold text-[#5E704F] hover:border-[#5E704F]"
            >
              Бухгалтер
            </Link>
            <Link
              href="/office?qa=secretary"
              target="_blank"
              className="rounded-full border border-zinc-200 px-4 py-2 font-semibold text-[#5E704F] hover:border-[#5E704F]"
            >
              Секретарь
            </Link>
            <form action={clearScenario}>
              <button
                type="submit"
                className="rounded-full border border-amber-300 px-4 py-2 font-semibold text-amber-900 hover:border-amber-400"
              >
                Вернуться в админ-режим
              </button>
            </form>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-zinc-900">Быстрый вход (prefill)</div>
          <p className="text-xs text-zinc-600">
            Открывает страницу логина с заполненным полем логина. Пароль нужно ввести вручную.
          </p>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link
              href="/login?as=chairman"
              target="_blank"
              data-testid="qa-login-chairman"
              className="rounded-full border border-zinc-200 px-4 py-2 font-semibold text-[#5E704F] hover:border-[#5E704F]"
            >
              Войти как Председатель
            </Link>
            <Link
              href="/login?as=accountant"
              target="_blank"
              data-testid="qa-login-accountant"
              className="rounded-full border border-zinc-200 px-4 py-2 font-semibold text-[#5E704F] hover:border-[#5E704F]"
            >
              Войти как Бухгалтер
            </Link>
            <Link
              href="/login?as=secretary"
              target="_blank"
              data-testid="qa-login-secretary"
              className="rounded-full border border-zinc-200 px-4 py-2 font-semibold text-[#5E704F] hover:border-[#5E704F]"
            >
              Войти как Секретарь
            </Link>
            <Link
              href="/login?as=resident"
              target="_blank"
              className="rounded-full border border-zinc-200 px-4 py-2 font-semibold text-[#5E704F] hover:border-[#5E704F]"
            >
              Войти как Житель
            </Link>
            <Link
              href="/login?as=admin"
              target="_blank"
              className="rounded-full border border-zinc-200 px-4 py-2 font-semibold text-[#5E704F] hover:border-[#5E704F]"
            >
              Войти как Админ
            </Link>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-zinc-900">Выбрать сценарий</div>
          <form action={setScenario} className="flex flex-wrap items-center gap-3 text-sm">
            <select
              name="scenario"
              defaultValue={current ?? ""}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="">— Не задан —</option>
              <option value="guest">Гость</option>
              <option value="resident_ok">Житель без долга</option>
              <option value="resident_debtor">Житель с долгом</option>
              <option value="admin">Админ</option>
              <option value="chairman">Председатель</option>
              <option value="accountant">Бухгалтер</option>
              <option value="secretary">Секретарь</option>
            </select>
            <button
              type="submit"
              className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4b5b40]"
            >
              Сохранить
            </button>
          </form>
          <form action={clearScenario} className="text-sm">
            <button
              type="submit"
              className="rounded-full border border-zinc-200 px-4 py-2 font-semibold text-zinc-800 hover:border-[#5E704F] hover:text-[#5E704F]"
            >
              Очистить тестовые состояния
            </button>
          </form>
          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-3">
            <QaCleanerClient />
          </div>
        </section>
      </div>
    </main>
  );
}
