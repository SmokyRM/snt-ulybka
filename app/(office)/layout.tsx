import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { getOfficeNavForRole } from "@/lib/officeNav";
import type { Role } from "@/lib/permissions";
import { isOfficeRole, isAdminRole, normalizeRole } from "@/lib/rbac";
import OfficeShell from "./office/OfficeShell";

const roleLabelMap: Record<Role, string> = {
  chairman: "Председатель",
  secretary: "Секретарь",
  accountant: "Бухгалтер",
  resident: "Житель",
  admin: "Админ",
};

export default async function OfficeLayout({ children }: { children: React.ReactNode }) {
  try {
    const user = await getEffectiveSessionUser();
    
    // Если нет сессии -> redirect на /staff/login?next=<encoded current url>
    if (!user) {
      redirect("/staff-login?next=/office");
    }
    
    // КРИТИЧНО: Используем ту же логику что middleware
    // 1. Берем effectiveRole из getEffectiveSessionUser (уже учитывает QA override)
    // 2. Нормализуем роль через normalizeRole
    // 3. Проверяем через isOfficeRole и isAdminRole
    // Sprint 7.6: Минимальный фикс - используем normalizeRole для гарантии консистентности
    const effectiveRole = user.role;
    const normalizedRole = normalizeRole(effectiveRole);
    
    // Проверяем office role (chairman, secretary, accountant) или admin через helper функции
    // ТА ЖЕ логика что в middleware (строка 304)
    // КРИТИЧНО: admin имеет доступ ко всем разделам, включая /office
    // Sprint 7.6: Если isOfficeRole(role)=true, гарантируем что доступ есть (фикс для chairman)
    const isOfficeAccess = isOfficeRole(normalizedRole) || isAdminRole(normalizedRole) || isOfficeRole(effectiveRole) || isAdminRole(effectiveRole);
    
    // Серверный лог для диагностики (одна строка)
    if (process.env.NODE_ENV !== "production") {
      console.log("[office-layout-guard]", {
        role: effectiveRole ?? "null",
        effectiveRole: effectiveRole ?? "null",
        normalizedRole,
        isOfficeRoleResult: isOfficeRole(normalizedRole),
        isAdminRoleResult: isAdminRole(normalizedRole),
        isOfficeAccess,
      });
    }
    
    if (!isOfficeAccess) {
      // Sprint 7.6: Подробный лог redirect-chain для диагностики
      const redirectChainLog = {
        source: "layout",
        file: "app/(office)/layout.tsx",
        function: "OfficeLayout",
        line: "~49",
        condition: "!isOfficeAccess",
        effectiveRole: effectiveRole ?? "null",
        normalizedRole,
        isOfficeRole: isOfficeRole(normalizedRole),
        isAdminRole: isAdminRole(normalizedRole),
        userId: user?.id ?? null,
      };
      if (process.env.NODE_ENV !== "production") {
        console.warn("[office-layout] Redirect to /forbidden:", redirectChainLog);
      }
      // Добавляем диагностические параметры для матрицы доступов
      redirect("/forbidden?reason=office.only&next=/office&src=layout");
    }
    
    // После проверки isOfficeAccess, normalizedRole гарантированно один из office ролей или admin
    // TypeScript не понимает это автоматически, поэтому используем type assertion
    // Это безопасно, так как isOfficeAccess гарантирует что normalizedRole ∈ {admin, chairman, secretary, accountant}
    const role = normalizedRole as "admin" | "chairman" | "secretary" | "accountant";

    // office-role (chairman/secretary/accountant/admin) -> рендер OfficeShell
    // Безопасно получаем navItems - функция всегда возвращает массив
    const navItems = getOfficeNavForRole(role);
    const roleLabel = roleLabelMap[role] ?? role;
    return (
      <OfficeShell 
        role={role} 
        roleLabel={roleLabel} 
        navItems={navItems} 
        hasQa={user.isQaOverride ?? false}
      >
        {children}
      </OfficeShell>
    );
  } catch (error) {
    // В dev режиме логируем ошибку для отладки
    if (process.env.NODE_ENV !== "production") {
      console.error("[office-layout] Error:", error);
    }
    // Пробрасываем ошибку дальше, чтобы error.tsx мог её обработать
    throw error;
  }
}
