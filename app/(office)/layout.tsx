import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { getOfficeNavForRole } from "@/lib/officeNav";
import type { Role } from "@/lib/permissions";
import { isOfficeRole } from "@/lib/rbac";
import OfficeShell from "./office/OfficeShell";

const roleLabelMap: Record<Role, string> = {
  chairman: "Председатель",
  secretary: "Секретарь",
  accountant: "Бухгалтер",
  resident: "Житель",
  admin: "Админ",
};

export default async function OfficeLayout({ children }: { children: React.ReactNode }) {
  const user = await getEffectiveSessionUser();
  
  // Если нет сессии -> redirect на /staff/login?next=<encoded current url>
  if (!user) {
    redirect("/staff/login?next=/office");
  }
  
  const role = (user.role as Role | undefined) ?? "resident";
  
  // Если роль не office-role -> redirect('/forbidden')
  if (!isOfficeRole(role)) {
    redirect("/forbidden");
  }

  // office-role (chairman/secretary/accountant/admin) -> рендер OfficeShell
  // Безопасно получаем navItems - функция всегда возвращает массив
  const navItems = getOfficeNavForRole(role);
  const roleLabel = roleLabelMap[role] ?? role;
  return (
    <OfficeShell role={role} roleLabel={roleLabel} navItems={navItems} hasQa={user.isQaOverride}>
      {children}
    </OfficeShell>
  );
}
