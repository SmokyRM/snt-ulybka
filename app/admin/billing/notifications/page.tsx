import { redirect } from "next/navigation";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import NotificationsClient from "./NotificationsClient";

export default async function BillingNotificationsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSessionUser();
  if (!hasFinanceAccess(user)) {
    redirect("/staff-login?next=/admin/billing/notifications");
  }

  const params = (await searchParams) ?? {};
  const plotIdsParam = typeof params.plotIds === "string" ? params.plotIds : null;
  const plotIds = plotIdsParam ? plotIdsParam.split(",").filter(Boolean) : [];

  return (
    <div className="space-y-6" data-testid="notifications-root">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">Уведомления</h1>
        <p className="text-sm text-zinc-600">
          Шаблоны с переменными {`{фио}`}, {`{долг}`}. Список рассылки — по должникам.
        </p>
      </div>
      <NotificationsClient initialPlotIds={plotIds} />
    </div>
  );
}