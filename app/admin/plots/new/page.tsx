import Link from "next/link";
import { redirect } from "next/navigation";
import PlotForm from "./PlotForm";
import { getSessionUser } from "@/lib/session.server";

export default async function NewPlotPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Новый участок</h1>
            <p className="text-sm text-zinc-600">Заполните данные для добавления.</p>
          </div>
          <Link
            href="/admin/plots"
            className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:border-zinc-400"
          >
            К списку
          </Link>
        </div>
        <PlotForm />
      </div>
    </main>
  );
}

