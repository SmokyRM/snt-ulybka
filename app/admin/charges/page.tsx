import { redirect } from "next/navigation";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { addCharge, getAllCharges, markChargePaid, type Charge } from "@/lib/charges";
import { getDecisions } from "@/lib/decisions";

async function createCharge(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!hasFinanceAccess(user)) redirect("/staff/login?next=/admin");
  const userId = (formData.get("userId") as string | null) ?? "";
  const type = (formData.get("type") as Charge["type"]) ?? "membership";
  const amount = Number(formData.get("amount"));
  const period = (formData.get("period") as string | null) ?? "";
  const decisionId = (formData.get("decisionId") as string | null) ?? "";
  await addCharge({ userId, type, amount, period, decisionId });
  redirect("/admin/charges");
}

async function setPaid(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!hasFinanceAccess(user)) redirect("/staff/login?next=/admin");
  const id = (formData.get("id") as string | null) ?? "";
  await markChargePaid(id);
  redirect("/admin/charges");
}

export default async function ChargesPage() {
  const user = await getSessionUser();
  if (!hasFinanceAccess(user)) redirect("/staff/login?next=/admin");

  const charges = await getAllCharges();
  const decisions = await getDecisions();
  const decisionMap = new Map(decisions.map((d) => [d.id, d]));

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Начисления</h1>
          <span className="rounded-full bg-[#2F3827]/10 px-3 py-1 text-xs font-semibold text-[#2F3827]">
            Только для админов
          </span>
        </div>

        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Добавить начисление</h2>
          <form action={createCharge} className="mt-3 grid gap-3 text-sm">
            <label className="text-zinc-800">
              User ID
              <input type="text" name="userId" required className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" />
            </label>
            <label className="text-zinc-800">
              Тип
              <select name="type" className="mt-1 w-full rounded border border-zinc-300 px-3 py-2">
                <option value="membership">Членские</option>
                <option value="target">Целевые</option>
                <option value="electricity">Электроэнергия</option>
              </select>
            </label>
            <label className="text-zinc-800">
              Сумма
              <input type="number" name="amount" step="0.01" min={0} required className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" />
            </label>
            <label className="text-zinc-800">
              Период (YYYY-MM)
              <input type="text" name="period" required className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" />
            </label>
            <label className="text-zinc-800">
              Решение / протокол
              <select name="decisionId" className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" required>
                <option value="">Выберите</option>
                {decisions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} ({d.date})
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="self-start rounded-full bg-[#5E704F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4d5d40]"
            >
              Добавить
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Список начислений</h2>
          {charges.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-700">Пока нет начислений.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {charges.map((c) => {
                const decision = decisionMap.get(c.decisionId);
                return (
                  <div key={c.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-800">
                    <div className="flex justify-between">
                      <span>{c.period}</span>
                      <span className="font-semibold">{c.amount} ₽</span>
                    </div>
                    <div className="text-xs text-zinc-600">User: {c.userId}</div>
                    <div className="text-xs text-zinc-600">Тип: {c.type}</div>
                    <div className="text-xs text-zinc-600">
                      Статус: {c.status === "paid" ? "Оплачено" : "Долг"}
                    </div>
                    {decision && (
                      <div className="text-xs text-zinc-700">
                        Основание: {decision.title} ({decision.date}){" "}
                        <a className="text-[#5E704F] underline" href={decision.docUrl} target="_blank" rel="noreferrer">
                          Открыть
                        </a>
                      </div>
                    )}
                    {c.status !== "paid" && (
                      <form action={setPaid} className="mt-2">
                        <input type="hidden" name="id" value={c.id} />
                        <button
                          type="submit"
                          className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-800 hover:border-zinc-400"
                        >
                          Отметить оплачено
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
