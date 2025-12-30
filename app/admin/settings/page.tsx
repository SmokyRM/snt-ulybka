import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { formatAdminTime } from "@/lib/settings.shared";
import { getSntSettings, updateSntSettingsByAdmin } from "@/lib/sntSettings";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) redirect("/login?next=/admin");

  const settings = getSntSettings();
  const saved = typeof searchParams?.saved === "string";

  async function saveSettings(formData: FormData) {
    "use server";
    const session = await getSessionUser();
    if (!hasAdminAccess(session)) redirect("/login?next=/admin");

    const parseNumber = (value: FormDataEntryValue | null, fallback: number) => {
      const raw = typeof value === "string" ? value.trim() : "";
      if (!raw) return fallback;
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    const current = getSntSettings();
    const electricityTariffRubPerKwh = parseNumber(
      formData.get("electricityTariffRubPerKwh"),
      current.value.electricityTariffRubPerKwh
    );
    const electricityPaymentDeadlineDay = parseNumber(
      formData.get("electricityPaymentDeadlineDay"),
      current.value.electricityPaymentDeadlineDay
    );
    const membershipFeeRubPerYear = parseNumber(
      formData.get("membershipFeeRubPerYear"),
      current.value.membershipFeeRubPerYear
    );
    const targetFeeRubPerYear = parseNumber(
      formData.get("targetFeeRubPerYear"),
      current.value.targetFeeRubPerYear ?? 0
    );
    const feesPaymentDeadlineDay = parseNumber(
      formData.get("feesPaymentDeadlineDay"),
      current.value.feesPaymentDeadlineDay
    );
    const bankRequisitesText =
      typeof formData.get("bankRequisitesText") === "string"
        ? (formData.get("bankRequisitesText") as string).trim()
        : current.value.bankRequisitesText;

    updateSntSettingsByAdmin({
      electricityTariffRubPerKwh,
      electricityPaymentDeadlineDay,
      membershipFeeRubPerYear,
      targetFeeRubPerYear,
      feesPaymentDeadlineDay,
      bankRequisitesText,
    });

    revalidatePath("/admin/settings");
    revalidatePath("/electricity");
    revalidatePath("/fees");
    redirect("/admin/settings?saved=1");
  }

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Настройки СНТ</h1>
          <p className="text-sm text-zinc-600">
            Тарифы, сроки и реквизиты для публичных страниц.
          </p>
          <p className="text-xs text-zinc-500">
            Последнее обновление: {formatAdminTime(settings.updatedAt)} (по местному времени)
          </p>
          {saved ? (
            <div className="text-xs font-semibold text-emerald-700">Сохранено</div>
          ) : null}
        </div>

        <form action={saveSettings} className="space-y-6">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Электроэнергия</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium text-zinc-800">Тариф, ₽/кВт·ч</span>
                <input
                  name="electricityTariffRubPerKwh"
                  defaultValue={settings.value.electricityTariffRubPerKwh}
                  type="number"
                  step="0.01"
                  className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-zinc-800">Срок оплаты (число)</span>
                <input
                  name="electricityPaymentDeadlineDay"
                  defaultValue={settings.value.electricityPaymentDeadlineDay}
                  type="number"
                  className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Взносы</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium text-zinc-800">Членские, ₽/сотка/год</span>
                <input
                  name="membershipFeeRubPerYear"
                  defaultValue={settings.value.membershipFeeRubPerYear}
                  type="number"
                  step="0.01"
                  className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-zinc-800">Целевые, ₽/сотка/год</span>
                <input
                  name="targetFeeRubPerYear"
                  defaultValue={settings.value.targetFeeRubPerYear ?? 0}
                  type="number"
                  step="0.01"
                  className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-zinc-800">Срок оплаты (число)</span>
                <input
                  name="feesPaymentDeadlineDay"
                  defaultValue={settings.value.feesPaymentDeadlineDay}
                  type="number"
                  className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Реквизиты</h2>
            <label className="mt-4 block space-y-1 text-sm">
              <span className="font-medium text-zinc-800">Текст реквизитов</span>
              <textarea
                name="bankRequisitesText"
                defaultValue={settings.value.bankRequisitesText}
                rows={6}
                className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
          </section>

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
