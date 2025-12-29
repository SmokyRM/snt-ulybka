import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/session.server";
import {
  createAccrualPeriod,
  ensureAccrualItem,
  listAccrualItems,
  listAccrualPeriods,
  listPayments,
  listPlots,
} from "@/lib/mockDb";
import { categoryForAccrualType } from "@/lib/paymentCategory";
import CreatePeriodFormClient, { type PeriodActionState } from "./CreatePeriodFormClient";

type PeriodType = "membership_fee" | "target_fee" | "electricity";

const formatAmount = (n: number) => n.toFixed(2);

async function createPeriodAction(
  _prevState: PeriodActionState,
  formData: FormData
): Promise<PeriodActionState> {
  "use server";
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/login?next=/admin");

  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  const type = (formData.get("type") as string) as PeriodType;
  const title = (formData.get("title") as string | null) || null;
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return { status: "error", message: "Некорректный период" };
  }
  try {
    createAccrualPeriod({ year, month, type, title });
  } catch (error) {
    const err = error instanceof Error ? error : new Error("Ошибка создания периода");
    return { status: "error", message: `Не удалось создать период: ${err.message}` };
  }

  const hasPlots = listPlots().length > 0;
  if (!hasPlots) {
    return {
      status: "warning",
      message: "Период создан, но данных для начисления нет. Проверьте реестр участков.",
    };
  }
  return {
    status: "success",
    message: `Период ${year}-${String(month).padStart(2, "0")} создан`,
  };
}

async function massAccrualAction(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/login?next=/admin");
  const periodId = formData.get("periodId") as string;
  const amount = Number(formData.get("amount"));
  if (!periodId || !Number.isFinite(amount) || amount <= 0) return;
  const plots = listPlots();
  plots.forEach((plot) => {
    const item = ensureAccrualItem(periodId, plot.id);
    item.amountAccrued = amount;
    item.updatedAt = new Date().toISOString();
  });
}

async function recalcElectricity(year: number, month: number) {
  "use server";
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/login?next=/admin");
  const { accrueElectricityForPeriod } = await import("@/lib/mockDb");
  accrueElectricityForPeriod({ year, month });
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/login?next=/admin");

  const typeParam = (typeof searchParams?.type === "string" ? searchParams.type : "membership_fee") as PeriodType;
  const periods = listAccrualPeriods().filter((p) => p.type === typeParam);
  const selectedPeriod =
    periods.find((p) => (typeof searchParams?.periodId === "string" ? searchParams.periodId : undefined) === p.id) ??
    periods.sort((a, b) => (a.year === b.year ? b.month - a.month : b.year - a.year))[0];

  const plots = listPlots();
  const items = selectedPeriod ? listAccrualItems(selectedPeriod.id) : [];
  const payments = selectedPeriod
    ? listPayments({ periodId: selectedPeriod.id, includeVoided: false, category: categoryForAccrualType(typeParam) })
    : [];
  const paidByPlot: Record<string, number> = {};
  payments.forEach((p) => {
    paidByPlot[p.plotId] = (paidByPlot[p.plotId] ?? 0) + p.amount;
  });

  const rows = items.map((i) => {
    const plot = plots.find((p) => p.id === i.plotId);
    const paid = paidByPlot[i.plotId] ?? 0;
    const debt = i.amountAccrued - paid;
    return {
      id: i.id,
      street: plot?.street ?? "",
      plotNumber: plot?.plotNumber ?? "",
      ownerName: plot?.ownerFullName ?? "—",
      accrued: i.amountAccrued,
      paid,
      debt,
    };
  });

  const totals = rows.reduce(
    (acc, r) => {
      acc.accrued += r.accrued;
      acc.paid += r.paid;
      acc.debt += r.debt;
      return acc;
    },
    { accrued: 0, paid: 0, debt: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Биллинг</h1>
        <div className="flex gap-2 text-sm">
          <Link
            href="/admin/billing?type=membership_fee"
            className={`rounded-full border px-3 py-1 transition ${
              typeParam === "membership_fee"
                ? "border-[#5E704F] bg-[#5E704F] text-white"
                : "border-zinc-300 text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            Членские
          </Link>
          <Link
            href="/admin/billing?type=target_fee"
            className={`rounded-full border px-3 py-1 transition ${
              typeParam === "target_fee"
                ? "border-[#5E704F] bg-[#5E704F] text-white"
                : "border-zinc-300 text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            Целевые
          </Link>
          <Link
            href="/admin/billing?type=electricity"
            className={`rounded-full border px-3 py-1 transition ${
              typeParam === "electricity"
                ? "border-[#5E704F] bg-[#5E704F] text-white"
                : "border-zinc-300 text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            Электроэнергия
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CreatePeriodFormClient
          action={createPeriodAction}
          typeParam={typeParam}
          defaultYear={new Date().getFullYear()}
          defaultMonth={new Date().getMonth() + 1}
        />

        {typeParam === "electricity" && selectedPeriod ? (
          <form action={recalcElectricity.bind(null, selectedPeriod.year, selectedPeriod.month)} className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">Пересчитать электроэнергию</h2>
            <p className="text-sm text-zinc-700">Период: {selectedPeriod.year}-{String(selectedPeriod.month).padStart(2, "0")}</p>
            <button
              type="submit"
              className="w-full rounded border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
            >
              Пересчитать
            </button>
          </form>
        ) : (
          selectedPeriod && (
            <form action={massAccrualAction} className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">Начислить всем</h2>
              <input type="hidden" name="periodId" value={selectedPeriod.id} />
              <label className="text-sm text-zinc-700">
                Сумма, ₽
                <input
                  type="number"
                  step="0.01"
                  name="amount"
                  className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
                  placeholder="Например, 1500"
                />
              </label>
              <button
                type="submit"
                className="w-full rounded bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4f5f42]"
              >
                Начислить всем
              </button>
            </form>
          )
        )}
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-zinc-800">
            Период: {selectedPeriod ? `${selectedPeriod.year}-${String(selectedPeriod.month).padStart(2, "0")}` : "—"}
            {selectedPeriod?.title ? ` • ${selectedPeriod.title}` : ""}
          </div>
          {selectedPeriod && (
            <div className="flex gap-2">
              <Link
                href={`/api/admin/billing/export.csv?periodId=${selectedPeriod.id}`}
                className="rounded border border-zinc-300 px-3 py-1 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
              >
                Export CSV
              </Link>
            </div>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
            <div className="font-semibold text-zinc-800">Как начать работу с биллингом</div>
            <p className="mt-1 text-sm text-zinc-600">
              Создайте период, проверьте реестр участков и при необходимости импортируйте платежи.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/admin/plots"
                className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
              >
                Открыть реестр участков
              </Link>
              <Link
                href="/admin/billing/import"
                className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
              >
                Импорт платежей
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-3 overflow-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-sm">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-700">Участок</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-700">ФИО</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-700">Начислено</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-700">Оплачено</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-700">Долг</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="px-3 py-2">
                        {r.street}, {r.plotNumber}
                      </td>
                      <td className="px-3 py-2">{r.ownerName}</td>
                      <td className="px-3 py-2">{formatAmount(r.accrued)}</td>
                      <td className="px-3 py-2">{formatAmount(r.paid)}</td>
                      <td className="px-3 py-2">{formatAmount(r.debt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3 text-sm font-semibold text-zinc-800">
              <div>Итого начислено: {formatAmount(totals.accrued)}</div>
              <div>Итого оплачено: {formatAmount(totals.paid)}</div>
              <div>Итого долг: {formatAmount(totals.debt)}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
