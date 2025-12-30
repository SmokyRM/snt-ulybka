import { redirect } from "next/navigation";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import DebtorsClient from "./DebtorsClient";
import OnboardingHintBanner from "../../_components/OnboardingHintBanner";

export default async function DebtorsPage() {
  const user = await getSessionUser();
  if (!hasFinanceAccess(user)) {
    redirect("/login?next=/admin");
  }

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Уведомления должникам</h1>
          <a
            href="/admin"
            className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
          >
            Назад
          </a>
        </div>
        <OnboardingHintBanner
          role={user?.role}
          storageKey="admin.onboarding.debtors"
          title="С чего начать"
          description="Сформируйте список и подготовьте уведомления."
          steps={[
            { label: "Выбрать тип и период" },
            { label: "Сформировать список должников", href: "/admin/notifications/debtors" },
            { label: "Экспортировать или отправить в Telegram", href: "/admin/notifications/debtors" },
          ]}
        />
        <DebtorsClient />
      </div>
    </main>
  );
}
