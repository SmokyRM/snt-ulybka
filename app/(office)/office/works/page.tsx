import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { listWorks } from "@/lib/office/works.store";
import WorksClient from "./WorksClient";

export default async function OfficeWorksPage() {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff/login?next=/office/works");
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    redirect("/forbidden?reason=office.only&next=/office");
  }
  const canEdit = role === "admin" || role === "chairman";

  const items = listWorks();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Работы и обслуживание</h1>
        <p className="text-sm text-zinc-600">Журнал выполненных работ на территории СНТ</p>
      </div>
      <WorksClient initialItems={items} canEdit={canEdit} />
    </div>
  );
}
