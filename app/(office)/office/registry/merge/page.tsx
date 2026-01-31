import AppLink from "@/components/AppLink";
import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { hasPermission as hasActionPermission } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { getDuplicateGroupByKey } from "@/lib/registry/core";
import MergeClient from "./MergeClient";
import OfficeErrorState from "../../_components/OfficeErrorState";

export default async function OfficeRegistryMergePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getEffectiveSessionUser();
  if (!session) {
    redirect("/staff-login?next=/office/registry/merge");
  }
  const role = (session.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    redirect("/forbidden?reason=office.only&next=/office/registry/merge");
  }

  if (!hasActionPermission(role, "registry.merge")) {
    return <OfficeErrorState message="Нет доступа к объединению записей (403)." />;
  }

  const params = (await searchParams) ?? {};
  const groupKey = typeof params.group === "string" ? decodeURIComponent(params.group) : "";
  if (!groupKey) {
    redirect("/office/registry/duplicates");
  }

  const group = getDuplicateGroupByKey(groupKey);
  if (!group) {
    redirect("/office/registry/duplicates");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Объединение дубликатов</h1>
          <p className="mt-1 text-sm text-zinc-600">{group.label}</p>
        </div>
        <AppLink
          href="/office/registry/duplicates"
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          ← К списку дублей
        </AppLink>
      </div>

      <MergeClient groupKey={group.key} persons={group.persons} />
    </div>
  );
}
