import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PlotEditForm from "./PlotEditForm";
import { membershipLabel } from "@/lib/membershipLabels";
import { findPlotById } from "@/lib/plotsDb";
import { getSessionUser } from "@/lib/session.server";

export default async function PlotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    redirect("/login");
  }
  const plot = findPlotById(id);
  if (!plot) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              {plot.street}
            </p>
            <h1 className="text-2xl font-semibold">
              Участок {plot.number}
            </h1>
            <p className="text-sm text-zinc-700">
              Статус: {membershipLabel[plot.membershipStatus]} · Подтверждён:{" "}
              {plot.isConfirmed ? "Да" : "Нет"}
            </p>
          </div>
          <Link
            href="/admin/plots"
            className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:border-zinc-400"
          >
            К списку
          </Link>
        </div>
        <PlotEditForm plot={plot} />
      </div>
    </main>
  );
}

