import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { listPlots } from "@/lib/plotsMaster.store";
import { LinkPlotForm } from "./LinkPlotForm";

export const metadata = {
  title: "Привязать участок — Личный кабинет",
};

export default async function LinkPlotPage() {
  const user = await getSessionUser();
  if (!user || (user.role !== "resident" && user.role !== "user" && user.role !== "admin")) {
    redirect("/login?next=/cabinet/link-plot");
  }
  const plots = listPlots({ street: 1 });

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6" data-testid="cabinet-link-plot-root">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <header className="space-y-2">
          <div className="text-xs text-zinc-500">
            <Link href="/cabinet" className="hover:text-[#5E704F] hover:underline">
              Личный кабинет
            </Link>{" "}
            → Привязать участок
          </div>
          <h1 className="text-2xl font-semibold">Запрос на подтверждение участка</h1>
          <p className="text-sm text-zinc-600">Укажите участок, чтобы правление подтвердило доступ.</p>
        </header>

        <LinkPlotForm user={user} plots={plots} />

        <div className="flex flex-wrap gap-4 text-xs font-semibold text-[#5E704F] underline">
          <Link href="/cabinet">← Вернуться в кабинет</Link>
          <Link href="/">← На главную</Link>
        </div>
      </div>
    </main>
  );
}
