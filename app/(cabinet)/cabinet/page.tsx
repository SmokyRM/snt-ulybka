import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { LogoutButton } from "@/components/LogoutButton";
import { getSessionUser } from "@/lib/session.server";
import { getUserPlotInfo } from "@/lib/getUserPlotInfo";
import { createAppeal, getUserAppeals } from "@/lib/appeals";
import { getUserFinanceInfo } from "@/lib/getUserFinanceInfo";


async function submitAppeal(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "user" && user.role !== "board")) {
    redirect("/login");
  }
  if (user.role === "admin") {
    const store = await Promise.resolve(cookies());
    const view = store.get("admin_view")?.value || "admin";
    if (view !== "user") {
      redirect("/admin");
    }
  }
  const text = (formData.get("appeal") as string | null) ?? "";
  await createAppeal(user.id ?? "", text);
  redirect("/cabinet");
}

export default async function CabinetPage() {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "user" && user.role !== "board")) {
    redirect("/login");
  }

  if (user.role === "admin") {
    const store = await Promise.resolve(cookies());
    const view = store.get("admin_view")?.value || "admin";
    if (view !== "user") {
      redirect("/admin");
    }
  }

  const plotInfo = await getUserPlotInfo(user.id ?? "");
  const plotNumber = plotInfo.plotNumber ?? "—";
  const street = plotInfo.street ?? "—";
  const membershipStatus =
    plotInfo.membershipStatus === "member"
      ? "Член"
      : plotInfo.membershipStatus === "non-member"
        ? "Не член"
        : "Данные уточняются";
  const appeals = await getUserAppeals(user.id ?? "");
  const finance = await getUserFinanceInfo(user.id ?? "");
  

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
          <a
            href="#appeals"
            className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:border-zinc-400"
          >
            Написать обращение
          </a>
        </div>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Участок</h2>
          <div className="mt-2 space-y-1 text-sm text-zinc-800">
            <div>
              Номер: <span className="font-semibold">{plotNumber}</span>
            </div>
            <div>
              Улица: <span className="font-semibold">{street}</span>
            </div>
            <div>Статус членства: {membershipStatus}</div>
          </div>
          {(plotInfo.membershipStatus === "unknown" || plotInfo.plotNumber === null || plotInfo.street === null) && (
            <p className="mt-2 text-xs text-zinc-600">
              Данные уточняются. Если вы недавно купили участок или сменились данные — отправьте обращение.
            </p>
          )}
        </section><section id="finance" className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Финансы</h2>
          <div className="mt-2 space-y-2 text-sm text-zinc-700">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
              <div className="font-semibold text-zinc-900">Членские взносы</div>
              <div>
                {finance.membershipDebt === null
                  ? "Данные уточняются"
                  : finance.membershipDebt === 0
                    ? "Задолженности нет"
                    : `Задолженность: ${finance.membershipDebt} ₽`}
              </div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
              <div className="font-semibold text-zinc-900">Электроэнергия</div>
              <div>
                {finance.electricityDebt === null
                  ? "Данные уточняются"
                  : finance.electricityDebt === 0
                    ? "Задолженности нет"
                    : `Задолженность: ${finance.electricityDebt} ₽`}
              </div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
              <div className="font-semibold text-zinc-900">Статус</div>
              <div>
                {finance.status === "ok"
                  ? "OK"
                  : finance.status === "debt"
                    ? "Есть задолженность"
                    : "Данные уточняются"}
              </div>
            </div>
          </div>
          {finance.status === "unknown" && (
            <p className="mt-2 text-xs text-zinc-600">
              Данные уточняются. Если вы недавно купили участок или сменились данные — отправьте обращение.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Документы</h2>
          <p className="mt-2 text-sm text-zinc-700">Устав, протоколы и решения размещены в разделе документов.</p>
          <Link
            href="/docs"
            className="mt-3 inline-flex rounded-full border border-[#5E704F] px-4 py-2 text-xs font-semibold text-[#5E704F] transition-colors hover:bg-[#5E704F]/10"
          >
            Открыть документы
          </Link>
        </section>

        <section id="appeals" className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Обращения</h2>
          <form action={submitAppeal} className="mt-3 space-y-3">
            <label className="block text-sm text-zinc-800">
              Текст обращения
              <textarea
                name="appeal"
                rows={3}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                placeholder="Опишите вопрос или проблему"
                required
              />
            </label>
            <button
              type="submit"
              className="rounded-full bg-[#5E704F] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#4d5d41]"
            >
              Отправить
            </button>
          </form>
          <div className="mt-4 space-y-2 text-sm text-zinc-800">
            <div className="text-sm font-semibold text-zinc-900">Мои обращения</div>
            {appeals.length === 0 ? (
              <p className="text-sm text-zinc-600">Обращений пока нет.</p>
            ) : (
              <ul className="space-y-2">
                {appeals.map((a) => (
                  <li key={a.id} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <div className="flex items-center justify-between text-xs text-zinc-600">
                      <span>{new Date(a.createdAt).toLocaleString("ru-RU")}</span>
                      <span>
                        {a.status === "new"
                          ? "Новый"
                          : a.status === "in_progress"
                            ? "В работе"
                            : "Отвечен"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-800">{a.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
