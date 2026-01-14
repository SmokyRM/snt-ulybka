import { redirect } from "next/navigation";
import Header from "@/components/home/Header";
import Footer from "@/components/home/Footer";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { getQaScenarioFromCookies } from "@/lib/qaScenario.server";
import { getOfficeCapabilities, type Role } from "@/lib/permissions";
import OfficeShell from "./office/OfficeShell";
import { canAccess, type Role as RbacRole } from "@/lib/rbac";

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
  const qa = await getQaScenarioFromCookies();
  const isDev = process.env.NODE_ENV !== "production";

  let role: Role | null = (user?.role as Role | undefined) ?? null;

  // In dev, allow QA override for staff roles even without a real session
  if (!role && isDev && qa) {
    if (qa === "chairman" || qa === "accountant" || qa === "secretary" || qa === "admin") {
      role = qa as Role;
    }
  }

  if (!role) {
    redirect("/staff-login?next=/office");
  }

  if (!(role === "chairman" || role === "accountant" || role === "secretary" || role === "admin")) {
    redirect("/staff-login?next=/office");
  }

  const caps = getOfficeCapabilities(role === "admin" ? "chairman" : role);
  // Use RBAC canAccess for filtering nav items
  const rbacRole: RbacRole = role === "admin" ? "admin" : role;
  const navItems = NAV_ITEMS.filter((item) => {
    // Map old capabilities to RBAC capabilities
    if (item.capability === "office.appeals.manage") {
      return canAccess(rbacRole, "office.appeals.read");
    }
    if (item.capability === "office.announcements.manage") {
      return canAccess(rbacRole, "office.announcements.read");
    }
    if (item.capability === "office.finance.manage") {
      return canAccess(rbacRole, "office.finance.view");
    }
    if (item.capability === "office.registry.read") {
      return canAccess(rbacRole, "office.access"); // registry is part of office.access
    }
    if (item.capability === "office.documents.manage") {
      return canAccess(rbacRole, "office.access"); // documents is part of office.access
    }
    return false;
  });
  const hasQa = Boolean(qa);

  return (
    <div className="min-h-screen bg-[#F8F1E9] text-zinc-900" data-testid="office-root">
      <Header />
      <OfficeShell role={role} roleLabel={roleLabel(role)} navItems={navItems} hasQa={hasQa}>
        {children}
      </OfficeShell>
      <Footer />
    </div>
  );
}
