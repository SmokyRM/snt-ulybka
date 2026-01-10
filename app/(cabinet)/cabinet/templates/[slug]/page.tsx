import Link from "next/link";
import { notFound } from "next/navigation";
import TemplateCopyCabinet from "./TemplateCopyCabinet";
import { buildTemplateContext, fillTemplate, getTemplateBySlug } from "@/lib/templates";
import { getSessionUser } from "@/lib/session.server";
import { getUserProfile } from "@/lib/userProfiles";
import { getUserPlots } from "@/lib/plots";

type Params = { params: { slug: string } };

export const metadata = {
  title: "Шаблон документа — СНТ «Улыбка»",
};

export default async function TemplatePage({ params }: Params) {
  const template = await getTemplateBySlug(params.slug);
  if (!template) notFound();
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "user" && user.role !== "board")) {
    return notFound();
  }
  const [profile, plots] = await Promise.all([
    getUserProfile(user.id ?? ""),
    getUserPlots(user.id ?? ""),
  ]);
  const uniquePlots = plots.map((p) => ({
    plotId: p.plotId,
    plotNumber: p.plotNumber,
    displayName: p.displayName ?? `Участок ${p.plotNumber ?? ""}`,
    cadastral: "cadastral" in p ? (p as { cadastral?: string | null }).cadastral ?? null : null,
  }));
  const options = [
    {
      id: "all",
      label: "Все участки",
      text: fillTemplate(template.content, buildTemplateContext(profile, uniquePlots)),
    },
    ...uniquePlots.map((p) => ({
      id: p.plotId ?? p.plotNumber ?? `plot-${p.displayName}`,
      label: p.displayName ?? p.plotNumber ?? "Участок",
      text: fillTemplate(template.content, buildTemplateContext(profile, [p])),
    })),
  ];

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="text-xs text-zinc-500">
          <Link href="/cabinet/templates" className="hover:text-[#5E704F] hover:underline">
            Шаблоны
          </Link>{" "}
          → {template.title}
        </div>
        <header className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-[#5E704F]">
            {template.category}
          </div>
          <h1 className="text-2xl font-semibold text-zinc-900">{template.title}</h1>
          <p className="text-sm text-zinc-600">{template.description ?? template.summary}</p>
        </header>
        <TemplateCopyCabinet options={options} />
      </div>
    </main>
  );
}
