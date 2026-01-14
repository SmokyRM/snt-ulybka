import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { can, type Role } from "@/lib/permissions";

const tiles: Array<{ label: string; href: string; capability: string; description: string }> = [
  { label: "Обращения", href: "/office/appeals", capability: "office.appeals.manage", description: "Обращения жителей и ответы" },
  { label: "Финансы", href: "/office/finance", capability: "office.finance.manage", description: "Должники, выгрузки и отчёты" },
  { label: "Реестр", href: "/office/registry", capability: "office.registry.read", description: "Участки и контакты" },
  { label: "Объявления", href: "/office/announcements", capability: "office.announcements.manage", description: "Публикации для жителей" },
];

export default async function OfficeDashboardPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login?next=/office/dashboard");
  const role = (session.role as Role | undefined) ?? "resident";
  if (!(role === "chairman" || role === "secretary" || role === "accountant" || role === "admin")) {
    redirect("/forbidden");
  }

  const allowedTiles = tiles.filter((tile) => can(role === "admin" ? "chairman" : role, tile.capability));

  return (
    <div className="space-y-4" data-testid="office-dashboard-root">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Офис СНТ</h1>
        <p className="text-sm text-zinc-600">Быстрый доступ к рабочим разделам</p>
      </div>
      {allowedTiles.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-6 text-sm text-zinc-600">
          Нет доступных разделов.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {allowedTiles.map((tile) => (
            <Link
              key={tile.href}
              href={tile.href}
              className="rounded-2xl border border-zinc-200 bg-white px-4 py-5 shadow-sm transition hover:border-[#5E704F]"
            >
              <div className="text-lg font-semibold text-zinc-900">{tile.label}</div>
              <div className="mt-1 text-sm text-zinc-600">{tile.description}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
