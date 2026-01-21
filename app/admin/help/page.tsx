import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, hasImportAccess } from "@/lib/session.server";

export default async function AdminHelpPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/staff/login?next=/admin");
  }
  if (!hasImportAccess(user)) {
    redirect("/staff/login?next=/admin");
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Инструкция по работе</h1>
        <p className="max-w-3xl text-sm text-zinc-600">
          Краткая памятка для разных ролей. Используйте разделы ниже, чтобы быстро
          сориентироваться и выполнить основные задачи.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h2 className="text-base font-semibold">Председатель</h2>
          <ol className="mt-3 list-decimal space-y-1 pl-4 text-sm text-zinc-700">
            <li>Реестр участков → проверьте статусы</li>
            <li>Тарифы взносов → обновите суммы</li>
            <li>Биллинг → создайте период и начисления</li>
            <li>Долги → контролируйте задолженности</li>
            <li>Уведомления → подготовьте рассылку</li>
            <li>Отчёты → проверьте сводные показатели</li>
          </ol>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h2 className="text-base font-semibold">Бухгалтер</h2>
          <ol className="mt-3 list-decimal space-y-1 pl-4 text-sm text-zinc-700">
            <li>Биллинг → проверьте начисления по периодам</li>
            <li>Импорт платежей → загрузите CSV</li>
            <li>Долги → отслеживайте остатки</li>
            <li>Экспорт → выгрузите отчёты</li>
          </ol>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h2 className="text-base font-semibold">Оператор</h2>
          <ol className="mt-3 list-decimal space-y-1 pl-4 text-sm text-zinc-700">
            <li>Импорт реестра → загрузите обновления</li>
            <li>Импорты платежей → проверьте ошибки</li>
            <li>Реестр участков → сверяйте пустые поля</li>
          </ol>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-base font-semibold">Первые 10 минут</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-700">
          <li>
            Откройте{" "}
            <Link className="text-[#5E704F] underline" href="/admin/registry?tab=plots">
              реестр участков
            </Link>{" "}
            и проверьте статусы.
          </li>
          <li>
            Проверьте{" "}
            <Link className="text-[#5E704F] underline" href="/admin/billing/tariffs">
              тарифы взносов
            </Link>{" "}
            и сроки.
          </li>
          <li>
            Создайте период в{" "}
            <Link className="text-[#5E704F] underline" href="/admin/billing">
              биллинге
            </Link>
            .
          </li>
          <li>
            Загрузите платежи в{" "}
            <Link className="text-[#5E704F] underline" href="/admin/billing/payments-import">
              импорте
            </Link>
            .
          </li>
          <li>
            Проверьте{" "}
            <Link className="text-[#5E704F] underline" href="/admin/billing/debts">
              долги
            </Link>{" "}
            и подготовьте уведомления.
          </li>
          <li>
            Если нужно, откройте{" "}
            <Link className="text-[#5E704F] underline" href="/admin/billing/debtors">
              должников
            </Link>{" "}
            для рассылки.
          </li>
        </ul>
      </section>
    </div>
  );
}
