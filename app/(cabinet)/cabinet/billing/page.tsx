import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { getResidentBalance } from "@/lib/billing.store";

export const metadata = {
  title: "Оплата и долги — Личный кабинет",
};

const formatCurrency = (value: number) => `${Math.round(value).toLocaleString("ru-RU")} ₽`;

export default async function BillingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/cabinet/billing");
  if (user.role !== "resident" && user.role !== "user" && user.role !== "admin") {
    redirect("/forbidden");
  }

  const balance = getResidentBalance(user.id);
  const hasData = balance.chargedTotal > 0 || balance.paidTotal > 0 || balance.recent.length > 0;
  const recent = balance.recent.slice(0, 5);

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6" data-testid="cabinet-billing-root">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header className="space-y-2">
          <div className="text-xs text-zinc-500">
            <Link href="/cabinet" className="hover:text-[#5E704F] hover:underline">
              Личный кабинет
            </Link>{" "}
            → Оплата и долги
          </div>
          <h1 className="text-2xl font-semibold">Оплата и долги</h1>
          <p className="text-sm text-zinc-600">
            Коротко о начислениях и оплатах. Данные демо, без реальных сумм.
          </p>
        </header>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Сводка</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
              <div className="text-xs text-zinc-500">Начислено</div>
              <div className="text-lg font-semibold text-zinc-900">{formatCurrency(balance.chargedTotal)}</div>
            </div>
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
              <div className="text-xs text-zinc-500">Оплачено</div>
              <div className="text-lg font-semibold text-emerald-700">{formatCurrency(balance.paidTotal)}</div>
            </div>
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
              <div className="text-xs text-zinc-500">Долг</div>
              <div className={`text-lg font-semibold ${balance.debt > 0 ? "text-rose-600" : "text-zinc-900"}`}>
                {formatCurrency(balance.debt)}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">История</div>
              <p className="mt-1 text-sm text-zinc-700">Последние начисления и оплаты по вашему участку.</p>
            </div>
            <Link
              href="/appeals/new"
              className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-[#5E704F] transition hover:border-[#5E704F]"
            >
              Есть вопрос
            </Link>
          </div>
          {!hasData ? (
            <div className="mt-3 rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-sm text-zinc-700">
              Данные по начислениям появятся после первых взносов и платежей.
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-zinc-200 text-sm text-zinc-800">
              {recent.map((item) => (
                <li key={`${item.type}-${item.date}-${item.title}`} className="flex items-center justify-between py-2">
                  <div>
                    <div className="text-xs text-zinc-500">{new Date(item.date).toLocaleDateString("ru-RU")}</div>
                    <div className="font-semibold">{item.title}</div>
                  </div>
                  <div
                    className={`text-sm font-semibold ${
                      item.type === "charge" ? "text-rose-600" : "text-emerald-700"
                    }`}
                  >
                    {item.type === "charge" ? "-" : "+"}
                    {formatCurrency(item.amount)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
