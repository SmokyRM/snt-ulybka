import { getQaScenarioFromCookies } from "@/lib/qaScenario.server";
import { getEffectiveSessionUser } from "@/lib/session.server";

const roleLabel = (role: string | null | undefined): string => {
  if (!role) return "Гость";
  if (role === "admin") return "Администратор";
  if (role === "chairman") return "Председатель";
  if (role === "accountant") return "Бухгалтер";
  if (role === "secretary") return "Секретарь";
  if (role === "resident" || role === "user" || role === "board") return "Житель";
  return "Пользователь";
};

export async function RoleIndicator() {
  const user = await getEffectiveSessionUser();
  const qa = await getQaScenarioFromCookies();
  const role = user?.role ?? null;
  const label = roleLabel(role);
  const hasQa = Boolean(qa);

  return (
    <div className="text-xs text-zinc-600" data-testid="role-indicator">
      Роль: {label}
      {hasQa ? " (QA)" : ""}
    </div>
  );
}
