import { redirect } from "next/navigation";
import Header from "@/components/home/Header";
import Footer from "@/components/home/Footer";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { getOfficeCapabilities, type Role } from "@/lib/permissions";
import OfficeShell from "./office/OfficeShell";

const NAV_ITEMS: Array<{ label: string; href: string; capability: string; testId: string }> = [
  { label: "Обращения", href: "/office/appeals", capability: "office.appeals.manage", testId: "office-nav-appeals" },
  { label: "Объявления", href: "/office/announcements", capability: "office.announcements.manage", testId: "office-nav-announcements" },
  { label: "Документы", href: "/office/documents", capability: "office.documents.manage", testId: "office-nav-documents" },
  { label: "Реестр", href: "/office/registry", capability: "office.registry.read", testId: "office-nav-registry" },
  { label: "Финансы", href: "/office/finance", capability: "office.finance.manage", testId: "office-nav-finance" },
];

const roleLabel = (role: Role) => {
  if (role === "admin") return "Администратор";
  if (role === "chairman") return "Председатель";
  if (role === "accountant") return "Бухгалтер";
  if (role === "secretary") return "Секретарь";
  return "Пользователь";
};

export default async function OfficeLayout({ children }: { children: React.ReactNode }) {
  const user = await getEffectiveSessionUser();
  if (!user) {
    redirect("/staff-login?next=/office");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!(role === "chairman" || role === "accountant" || role === "secretary" || role === "admin")) {
    redirect("/staff-login?next=/office");
  }

  const caps = getOfficeCapabilities(role === "admin" ? "chairman" : role);
  const navItems = NAV_ITEMS.filter((item) => caps.has(item.capability));

  return (
    <div className="min-h-screen bg-[#F8F1E9] text-zinc-900">
      <Header />
      <OfficeShell role={role} roleLabel={roleLabel(role)} navItems={navItems}>
        {children}
      </OfficeShell>
      <Footer />
    </div>
  );
}
