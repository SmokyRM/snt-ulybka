import { redirect } from "next/navigation";
import Header from "@/components/home/Header";
import Footer from "@/components/home/Footer";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { can, getOfficeCapabilities, type Role } from "@/lib/permissions";
import AppLink from "@/components/AppLink";

const navItems: Array<{ label: string; href: string; capability: string }> = [
  { label: "Обращения", href: "/office/appeals", capability: "office.appeals.manage" },
  { label: "Финансы", href: "/office/finance", capability: "office.finance.manage" },
  { label: "Реестр", href: "/office/registry", capability: "office.registry.read" },
  { label: "Объявления", href: "/office/announcements", capability: "office.announcements.manage" },
];

export default async function OfficeLayout({ children }: { children: React.ReactNode }) {
  const user = await getEffectiveSessionUser();
  if (!user) {
    redirect("/login?next=/office");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!(role === "chairman" || role === "accountant" || role === "secretary" || role === "admin")) {
    redirect("/forbidden");
  }
  const caps = getOfficeCapabilities(role === "admin" ? "chairman" : role);
  const visibleNav = navItems.filter((item) => caps.has(item.capability));

  return (
    <div className="min-h-screen bg-[#F8F1E9] text-zinc-900">
      <Header />
      <main className="mx-auto flex w-full max-w-6xl gap-6 px-4 pb-10 pt-10 sm:px-6">
        <aside className="w-64 shrink-0 space-y-2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-zinc-900">Офис</div>
          <div className="space-y-1 text-sm">
            {visibleNav.map((item) => (
              <AppLink
                key={item.href}
                href={item.href}
                className="block rounded-lg px-3 py-2 text-zinc-700 transition hover:bg-zinc-50"
              >
                {item.label}
              </AppLink>
            ))}
            {!visibleNav.length ? (
              <div className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500">Нет доступных разделов</div>
            ) : null}
          </div>
        </aside>
        <div className="flex-1">{children}</div>
      </main>
      <Footer />
    </div>
  );
}
