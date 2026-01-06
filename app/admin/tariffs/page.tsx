import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { formatAdminTime } from "@/lib/settings.shared";
import { getMembershipTariffSetting, updateMembershipTariffByAdmin } from "@/lib/membershipTariff";
import { logAdminAction } from "@/lib/audit";

export default async function AdminTariffsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) redirect("/login?next=/admin");

  const tariffSetting = getMembershipTariffSetting();
  const status = typeof params.status === "string" ? params.status : null;
  const message = typeof params.message === "string" ? params.message : null;

  async function saveTariff(formData: FormData) {
    "use server";
    const session = await getSessionUser();
    if (!hasAdminAccess(session)) redirect("/login?next=/admin");

    const raw = typeof formData.get("membershipMonthlyAmount") === "string"
      ? (formData.get("membershipMonthlyAmount") as string).trim()
      : "";
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
      const params = new URLSearchParams({
        status: "error",
        message: "Сумма должна быть больше 0 и не превышать 1 000 000",
      });
      redirect(`/admin/tariffs?${params.toString()}`);
    }

    const current = getMembershipTariffSetting();
    updateMembershipTariffByAdmin(amount);
    await logAdminAction({
      action: "tariff_membership_updated",
      entity: "membership_tariff",
      entityId: null,
      before: { amount: current.value },
      after: { amount },
    });
    revalidatePath("/admin/tariffs");
    revalidatePath("/admin/billing");
    redirect("/admin/tariffs?status=saved");
  }

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Тарифы взносов</h1>
          <p className="text-sm text-zinc-600">Настройка базовой месячной ставки членских взносов.</p>
          <p className="text-xs text-zinc-500">
            Последнее обновление: {formatAdminTime(tariffSetting.updatedAt)} (по местному времени)
          </p>
          {status === "saved" ? (
            <div className="text-xs font-semibold text-emerald-700">Сохранено</div>
          ) : null}
          {status === "error" ? (
            <div className="text-xs font-semibold text-rose-600">
              {message || "Не удалось сохранить"}
            </div>
          ) : null}
        </div>

        <form action={saveTariff} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-zinc-800">Членские взносы, ₽/мес</span>
            <input
              name="membershipMonthlyAmount"
              defaultValue={tariffSetting.value}
              type="number"
              step="0.01"
              className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            className="rounded-full bg-[#5E704F] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41]"
          >
            Сохранить
          </button>
        </form>
      </div>
    </main>
  );
}
