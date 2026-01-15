import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isOfficeRole } from "@/lib/rbac";

export default async function OfficeTemplatesPage() {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff-login?next=/office/templates");
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isOfficeRole(role)) redirect("/forbidden");

  return (
    <div className="space-y-3" data-testid="office-page-templates">
      <h1 className="text-2xl font-semibold text-zinc-900">Шаблоны</h1>
      <p className="text-sm text-zinc-600">Раздел в разработке. Здесь будут шаблоны документов для правления.</p>
    </div>
  );
}
