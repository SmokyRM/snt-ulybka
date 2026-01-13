import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { can, type Role } from "@/lib/permissions";
import { getRegistryItem } from "@/lib/registry.store";

type Props = { params: { id: string } };

export default async function RegistryItemPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/office/registry");
  const role = (user?.role as Role | undefined) ?? "resident";
  const normalizedRole = role === "admin" ? "chairman" : role;
  if (!can(normalizedRole, "office.registry.manage") && !can(normalizedRole, "office.registry.read")) {
    redirect("/forbidden");
  }

  const item = getRegistryItem(params.id);
  if (!item) notFound();

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm" data-testid="office-registry-item-root">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">{item.plotNumber}</h1>
          {item.ownerName ? <p className="text-sm text-zinc-600">Владелец: {item.ownerName}</p> : null}
        </div>
        <div className="text-xs text-zinc-500">
          Обновлено {new Date(item.updatedAt).toLocaleDateString("ru-RU")}
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-zinc-700 sm:grid-cols-2">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Контакты</div>
          {item.phone ? <div>{item.phone}</div> : <div className="text-zinc-500">Телефон не указан</div>}
          {item.email ? <div className="text-xs text-zinc-500">{item.email}</div> : null}
        </div>
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Действия</div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/office/finance?q=${encodeURIComponent(item.plotNumber)}`}
              className="inline-flex items-center justify-center rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-[#5E704F] hover:border-[#5E704F]"
              data-testid="registry-open-finance"
            >
              Открыть финансы
            </Link>
            <Link
              href={`/office/appeals?q=${encodeURIComponent(item.plotNumber)}`}
              className="inline-flex items-center justify-center rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-[#5E704F] hover:border-[#5E704F]"
              data-testid="registry-open-appeals"
            >
              Открыть обращения
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
