import { redirect } from "next/navigation";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { isAdminRole, isOfficeRole } from "@/lib/rbac";
import PaymentsImportClient from "./PaymentsImportClient";

export default async function PaymentsImportPage() {
  const user = await getSessionUser();
  if (!user) redirect("/staff-login?next=/admin/billing/payments/import");
  if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
    redirect("/forbidden?reason=billing&next=/admin/billing/payments/import");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">Импорт платежей</h1>
        <p className="text-sm text-zinc-600">
          Загрузка CSV → предпросмотр → Применить. Колонки: date, amount; опционально plotNumber, ownerName, phone, comment.
        </p>
        <details className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
          <summary className="cursor-pointer font-medium">Подробнее о формате CSV</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>date</strong>, <strong>amount</strong> — обязательные. Ошибки: пустая сумма, неверная дата, сумма ≤ 0.</li>
            <li>Match: по plotNumber → участок; иначе по phone или ownerName (warning).</li>
          </ul>
        </details>
      </div>
      <PaymentsImportClient />
    </div>
  );
}
