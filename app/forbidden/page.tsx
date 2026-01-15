import { getSessionUser, getEffectiveSessionUser } from "@/lib/session.server";
import { normalizeRole } from "@/lib/rbac";
import { qaEnabled } from "@/lib/qaScenario";
import { getQaScenarioFromCookies } from "@/lib/qaScenario.server";
import ForbiddenCtas from "./ForbiddenCtas";

export const metadata = {
  title: "Нет доступа — СНТ «Улыбка»",
  alternates: { canonical: "/forbidden" },
};

type SearchParams = {
  reason?: string | string[];
};

const REASON_LABELS: Record<string, string> = {
  "auth.required": "Требуется вход в систему.",
  "admin.only": "Доступно только админам.",
  "office.only": "Доступно только сотрудникам офиса.",
  "cabinet.only": "Только члены СНТ могут попасть на эту страницу.",
  forbidden: "У вас нет прав для этой операции.",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Администратор",
  board: "Совет",
  accountant: "Бухгалтер",
  secretary: "Секретарь",
  chairman: "Председатель",
  operator: "Оператор",
  resident: "Член СНТ",
  user: "Член СНТ",
};

export default async function ForbiddenPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await Promise.resolve(searchParams)) ?? {};
  const reasonKey = Array.isArray(params.reason) ? params.reason[0] : params.reason;
  const reasonText = reasonKey ? REASON_LABELS[reasonKey] ?? reasonKey : "Доступ ограничен.";
  
  // Используем effectiveUser для учета QA override
  const effectiveUser = await getEffectiveSessionUser();
  const user = effectiveUser || await getSessionUser();
  
  // Проверяем QA cookie напрямую для определения admin роли через QA override (даже без реальной сессии)
  const qaScenario = await getQaScenarioFromCookies();
  const isQaAdmin = qaScenario === "admin";
  
  // Определяем роль: если есть QA override - используем его, иначе роль из сессии
  const effectiveRole = isQaAdmin ? "admin" : (user?.role ?? null);
  const roleText = effectiveRole ? ROLE_LABELS[effectiveRole] ?? effectiveRole : "Гость";
  
  const normalizedRole = normalizeRole(effectiveRole);
  const canAccessAdmin = normalizedRole === "admin";
  const canAccessOffice =
    normalizedRole === "admin" ||
    normalizedRole === "chairman" ||
    normalizedRole === "secretary" ||
    normalizedRole === "accountant";
  
  // QA режим доступен только в dev с ENABLE_QA=true
  const isQaEnabled = qaEnabled();
  const showQaCabinetButton = isQaEnabled && canAccessAdmin;

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-[#F8F1E9] px-4 py-10 text-zinc-900"
      data-testid="forbidden-root"
    >
      <div className="max-w-md rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Нет доступа</h1>
        <p className="mt-3 text-sm text-zinc-600">{reasonText}</p>
        {user && (
          <p className="mt-1 text-sm text-zinc-600">
            Ваша роль: <span className="font-semibold text-zinc-900">{roleText}</span>
          </p>
        )}
        {!user && (
          <p className="mt-1 text-sm text-zinc-600">
            Требуется авторизация для доступа к этой странице.
          </p>
        )}
        {showQaCabinetButton && (
          <p className="mt-3 text-xs text-zinc-500">
            Роль Администратор не имеет доступа к кабинету жителя. Для проверки используйте QA-вход.
          </p>
        )}
        <ForbiddenCtas 
          canAccessAdmin={canAccessAdmin} 
          canAccessOffice={canAccessOffice}
          showQaCabinetButton={showQaCabinetButton}
        />
      </div>
    </main>
  );
}
