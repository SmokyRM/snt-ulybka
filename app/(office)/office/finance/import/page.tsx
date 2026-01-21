import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { assertCan, isStaffOrAdmin } from "@/lib/rbac";
import type { Role } from "@/lib/permissions";
import { previewImport, confirmImport, type ImportPreviewRow } from "@/server/services/finance";
import AppLink from "@/components/AppLink";
import FinanceImportClient from "./FinanceImportClient";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OfficeFinanceImportPage({ searchParams }: Props) {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff/login?next=/office/finance/import");
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    redirect("/forbidden?reason=office.only&next=/office");
  }

  try {
    assertCan(role, "finance.mutate", "finance");
  } catch {
    redirect("/forbidden?reason=office.only&next=/office");
  }

  const params = (await searchParams) ?? {};
  const step = typeof params.step === "string" ? params.step : "upload";

  async function confirmImportAction(formData: FormData) {
    "use server";
    const session = await getEffectiveSessionUser();
    if (!session) redirect("/staff/login?next=/office/finance/import");
    const sessionRole = (session.role as Role | undefined) ?? "resident";
    try {
      assertCan(sessionRole, "finance.mutate", "finance");
    } catch {
      redirect("/forbidden");
    }

    const rowsJson = formData.get("rows");
    if (typeof rowsJson !== "string") return;

    try {
      const rows = JSON.parse(rowsJson) as ImportPreviewRow[];
      const result = await confirmImport(rows);
      revalidatePath("/office/finance");
      redirect(`/office/finance/import?step=success&imported=${result.imported}&skipped=${result.skipped}`);
    } catch {
      redirect("/office/finance/import?step=error");
    }
  }

  return (
    <div className="space-y-4" data-testid="finance-import">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Импорт платежей</h1>
          <p className="text-sm text-zinc-600">Загрузите CSV файл с платежами для импорта</p>
        </div>
        <AppLink
          href="/office/finance"
          className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-[#5E704F]"
        >
          Назад
        </AppLink>
      </div>

      <FinanceImportClient step={step} confirmAction={confirmImportAction} />
    </div>
  );
}
