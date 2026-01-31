import AppLink from "@/components/AppLink";
import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { hasPermission as hasActionPermission } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { listDuplicateGroups, type DuplicateGroupType } from "@/lib/registry/core";
import OfficeErrorState from "../../_components/OfficeErrorState";

const toSafeTestId = (key: string) =>
  key.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 64);

export default async function OfficeRegistryDuplicatesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getEffectiveSessionUser();
  if (!session) {
    redirect("/staff-login?next=/office/registry/duplicates");
  }
  const role = (session.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    redirect("/forbidden?reason=office.only&next=/office/registry/duplicates");
  }

  if (!hasActionPermission(role, "registry.view")) {
    return <OfficeErrorState message="Нет доступа к просмотру реестра (403)." />;
  }

  const params = (await searchParams) ?? {};
  const type = typeof params.type === "string" ? (params.type as DuplicateGroupType) : undefined;
  const groups = listDuplicateGroups(type);
  const canMerge = hasActionPermission(role, "registry.merge");

  return (
    <div className="space-y-6" data-testid="office-registry-duplicates-root">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Дубликаты реестра</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Сгруппированы по телефону или по ФИО+участку.
          </p>
        </div>
        <div className="flex gap-2">
          <AppLink
            href="/office/registry"
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            ← К реестру
          </AppLink>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {[
          { key: "phone", label: "По телефону" },
          { key: "name_plot", label: "ФИО + участок" },
        ].map((item) => (
          <AppLink
            key={item.key}
            href={`/office/registry/duplicates?type=${item.key}`}
            className={`rounded-full border px-3 py-1 font-semibold ${
              type === item.key ? "border-[#5E704F] bg-[#5E704F]/10 text-[#5E704F]" : "border-zinc-200 text-zinc-600"
            }`}
          >
            {item.label}
          </AppLink>
        ))}
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-10 text-center text-sm text-zinc-600" data-testid="office-registry-empty">
          Дубликаты не найдены.
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div
              key={group.key}
              className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
              data-testid={`office-registry-duplicate-group-${toSafeTestId(group.key)}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-zinc-900">{group.label}</div>
                  <div className="text-xs text-zinc-500">Найдено: {group.persons.length}</div>
                </div>
                {canMerge && (
                  <AppLink
                    href={`/office/registry/merge?group=${encodeURIComponent(group.key)}`}
                    className="rounded-lg border border-[#5E704F] px-3 py-1.5 text-xs font-semibold text-[#5E704F] hover:bg-[#5E704F]/10"
                  >
                    Объединить
                  </AppLink>
                )}
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {group.persons.map((person) => (
                  <div key={person.id} className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
                    <div className="text-sm font-semibold text-zinc-900">{person.fullName || "—"}</div>
                    <div className="text-xs text-zinc-600">Телефон: {person.phone || "—"}</div>
                    <div className="text-xs text-zinc-600">Email: {person.email || "—"}</div>
                    <div className="mt-1 text-xs text-zinc-500">ID: {person.id}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
