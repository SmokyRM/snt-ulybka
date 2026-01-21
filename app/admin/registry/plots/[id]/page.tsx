import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import BackToListLink from "@/components/BackToListLink";
import {
  findPlotById,
  listAccrualItems,
  listAccrualPeriods,
  listDebtNotificationsByPlot,
  listPayments,
  listPersons,
  updatePlotStatus,
} from "@/lib/mockDb";
import { formatAdminTime } from "@/lib/settings.shared";
import { membershipLabel } from "@/lib/membershipLabels";
import { categoryForAccrualType } from "@/lib/paymentCategory";
import { NotificationStatusActions } from "./NotificationStatusActions";

const formatCurrency = (value: number) => `${value.toFixed(2)} ₽`;

export default async function RegistryDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) redirect("/staff/login?next=/admin");

  const plot = findPlotById(id);
  if (!plot) {
    return (
      <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Участок не найден</h1>
          <Link href="/admin/registry" className="text-[#5E704F] underline">
            Вернуться к реестру
          </Link>
        </div>
      </main>
    );
  }

  const currentPlot = plot;
  const persons = listPersons();
  const periods = listAccrualPeriods();
  const accrualItems = periods
    .flatMap((p) => listAccrualItems(p.id).map((a) => ({ ...a, period: p })))
    .filter((a) => a.plotId === currentPlot.id)
    .sort((a, b) => (b.period.year - a.period.year) || b.period.month - a.period.month)
    .slice(0, 36);

  const payments = listPayments({ plotId: currentPlot.id, includeVoided: true }).sort((a, b) =>
    (b.paidAt ?? "").localeCompare(a.paidAt ?? "")
  );

  const notifications = listDebtNotificationsByPlot(currentPlot.id).sort((a, b) =>
    (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")
  );

  const accrualRows = accrualItems.map((acc) => {
    const category = categoryForAccrualType(acc.period.type);
    const paid = payments
      .filter((p) => !p.isVoided && p.periodId === acc.periodId && p.category === category)
      .reduce((sum, p) => sum + p.amount, 0);
    const debt = acc.amountAccrued - paid;
    return {
      period: `${acc.period.year}-${String(acc.period.month).padStart(2, "0")}`,
      type: acc.period.type,
      amountAccrued: acc.amountAccrued,
      amountPaid: paid,
      debt,
    };
  });

  const owners = persons.filter((p) => p.id === currentPlot.ownerUserId);

  async function updateStatus(formData: FormData) {
    "use server";
    const status = (formData.get("status") as string) ?? currentPlot.status;
    const membershipStatus = (formData.get("membershipStatus") as string) ?? currentPlot.membershipStatus;
    updatePlotStatus(currentPlot.id, {
      status: status === "archived" ? "archived" : "active",
      membershipStatus:
        membershipStatus === "MEMBER" ||
        membershipStatus === "NON_MEMBER" ||
        membershipStatus === "PENDING" ||
        membershipStatus === "UNKNOWN"
          ? membershipStatus
          : currentPlot.membershipStatus,
    });
  }

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">
            Участок {currentPlot.street}, {currentPlot.plotNumber}
          </h1>
          <BackToListLink href="/admin/registry" />
        </div>

        <section className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="font-semibold text-zinc-900">Редактирование данных</p>
              <p>
                Данные участков редактируются через импорт CSV, чтобы сохранять консистентность
                реестра.
              </p>
              <p className="text-xs text-zinc-500">Почему так? Импорт исключает случайные расхождения.</p>
            </div>
            <Link
              href="/admin/registry"
              className="rounded-full border border-[#5E704F] px-4 py-2 text-xs font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
            >
              Перейти в импорт
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Профиль</h2>
          <div className="mt-3 grid gap-3 text-sm text-zinc-800 sm:grid-cols-2">
            <div>
              <p className="font-semibold">Улица</p>
              <p>{currentPlot.street}</p>
            </div>
            <div>
              <p className="font-semibold">Участок</p>
              <p>{currentPlot.plotNumber}</p>
            </div>
            <div>
              <p className="font-semibold">Членство</p>
              <p>{membershipLabel(currentPlot.membershipStatus)}</p>
            </div>
            <div>
              <p className="font-semibold">Архив</p>
              <p>{currentPlot.status === "archived" ? "Да" : "Нет"}</p>
            </div>
            <div>
              <p className="font-semibold">Владелец</p>
              <p>{currentPlot.ownerFullName ?? owners[0]?.fullName ?? "—"}</p>
            </div>
            <div>
              <p className="font-semibold">Контакты</p>
              <p>{currentPlot.phone ?? owners[0]?.phone ?? currentPlot.email ?? owners[0]?.email ?? "—"}</p>
            </div>
            <div>
              <p className="font-semibold">Обновлено</p>
              <p>{formatAdminTime(currentPlot.updatedAt)}</p>
            </div>
          </div>
          <form action={updateStatus} className="mt-4 grid gap-3 text-sm sm:grid-cols-3 sm:items-end">
            <label className="flex flex-col gap-1">
              <span className="font-medium text-zinc-800">Статус</span>
              <select name="status" defaultValue={plot.status} className="rounded border border-zinc-300 px-3 py-2">
                <option value="active">Активен</option>
                <option value="archived">В архиве</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-medium text-zinc-800">Членство</span>
              <select
                name="membershipStatus"
                defaultValue={plot.membershipStatus}
                className="rounded border border-zinc-300 px-3 py-2"
              >
                <option value="MEMBER">Член</option>
                <option value="NON_MEMBER">Не член</option>
                <option value="PENDING">На проверке</option>
                <option value="UNKNOWN">Не определено</option>
              </select>
            </label>
            <button
              type="submit"
              className="rounded bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4f5f42]"
            >
              Сохранить
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold">Начисления</h2>
          <div className="overflow-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">Период</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">Тип</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">Начислено</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">Оплачено</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">Долг</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {accrualRows.map((row, idx) => (
                  <tr key={`${row.period}-${row.type}-${idx}`}>
                    <td className="px-3 py-2">{row.period}</td>
                    <td className="px-3 py-2">{row.type}</td>
                    <td className="px-3 py-2">{formatCurrency(row.amountAccrued)}</td>
                    <td className="px-3 py-2">{formatCurrency(row.amountPaid)}</td>
                    <td className="px-3 py-2 font-semibold text-red-700">{formatCurrency(row.debt)}</td>
                  </tr>
                ))}
                {accrualRows.length === 0 && (
                  <tr>
                    <td className="px-3 py-3 text-center text-zinc-600" colSpan={5}>
                      Нет начислений
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold">Платежи</h2>
          <div className="overflow-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">Дата</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">Сумма</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">Категория</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">Назначение</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">Импорт</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {payments.map((p) => (
                  <tr key={p.id} className={p.isVoided ? "text-zinc-500" : ""}>
                    <td className="px-3 py-2">{formatAdminTime(p.paidAt)}</td>
                    <td className="px-3 py-2">{formatCurrency(p.amount)}</td>
                    <td className="px-3 py-2">{p.category ?? "—"}</td>
                    <td className="px-3 py-2">{p.comment ?? "—"}</td>
                    <td className="px-3 py-2">{p.importBatchId ?? "—"}</td>
                    <td className="px-3 py-2">{p.isVoided ? "Аннулирован" : "Активен"}</td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td className="px-3 py-3 text-center text-zinc-600" colSpan={6}>
                      Платежей нет
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold">Уведомления</h2>
          <NotificationStatusActions plotId={plot.id} notifications={notifications} />
        </section>
      </div>
    </main>
  );
}
