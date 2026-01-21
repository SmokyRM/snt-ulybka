import { redirect } from "next/navigation";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import PaymentsImportNewClient from "./PaymentsImportNewClient";
import AdminHelp from "../../_components/AdminHelp";

export default async function PaymentsImportNewPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/staff-login?next=/admin/billing/payments-import-new");
  }
  if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
    redirect("/forbidden?reason=finance.access&next=/admin/billing/payments-import-new");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">Импорт платежей</h1>
        <p className="text-sm text-zinc-600">
          Загрузите CSV файл с платежами. Система автоматически сопоставит платежи с участками.
        </p>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          <p className="font-medium">Требования к CSV:</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>Обязательные колонки: Дата, Сумма</li>
            <li>Опциональные: Назначение, ФИО, Телефон, Участок, Номер операции</li>
            <li>Разделитель: точка с запятой (;) или запятая (,)</li>
            <li>Кодировка: UTF-8</li>
            <li>Первая строка - заголовки</li>
          </ul>
          <p className="mt-2 font-medium">Сопоставление участков (по приоритету):</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5">
            <li>Номер участка (точное совпадение)</li>
            <li>Телефон (нормализованный)</li>
            <li>ФИО (без учета регистра)</li>
          </ol>
        </div>
      </div>
      <AdminHelp
        title="Об импорте платежей"
        content="После загрузки CSV файла система покажет предпросмотр с сопоставлением платежей и участков. Проверьте результаты, исправьте ошибки сопоставления вручную и примените импорт. Все импорты сохраняются в журнале."
      />
      <PaymentsImportNewClient />
    </div>
  );
}
