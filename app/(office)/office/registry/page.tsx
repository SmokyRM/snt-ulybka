<<<<<<< HEAD
import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { can, type Role } from "@/lib/permissions";
import { listRegistry, type OwnershipStatus } from "@/lib/residentsRegistry.store";
import { verifyOwnershipAction, rejectOwnershipAction } from "./actions";

type Props = {
  searchParams?: {
    street?: string;
    status?: string;
    q?: string;
  };
};

const statusOptions = [
  { value: "all", label: "Все" },
  { value: "pending", label: "На проверке" },
  { value: "verified", label: "Подтверждено" },
  { value: "rejected", label: "Отклонено" },
];

export default async function OfficeRegistryPage({ searchParams }: Props) {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff-login?next=/office/registry");
  const rawRole = user.role as import("@/lib/rbac").Role | "user" | "board" | undefined;
  const { canAccess, getForbiddenReason } = await import("@/lib/rbac");
  const normalizedRole: import("@/lib/rbac").Role =
    rawRole === "user" || rawRole === "board"
      ? "resident"
      : rawRole ?? "guest";

  // Guard: office.access
  if (!canAccess(normalizedRole, "office.access")) {
    const reason = getForbiddenReason(normalizedRole, "office.access");
    redirect(`/forbidden?reason=${encodeURIComponent(reason)}&next=${encodeURIComponent("/office/registry")}`);
  }

  // UI permissions: write only for admin/chairman
  const canWriteRegistry = normalizedRole === "admin" || normalizedRole === "chairman";

  const street = searchParams?.street ? Number(searchParams.street) : undefined;
  const statusParam = searchParams?.status ?? "all";
  const q = searchParams?.q ?? "";

  const rows = listRegistry({
    street: street && !Number.isNaN(street) ? street : undefined,
    status: statusParam === "all" ? "all" : (statusParam as OwnershipStatus),
    q,
  });

  return (
    <div className="space-y-4" data-testid="office-registry-root">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Реестр участков</h1>
          <p className="text-sm text-zinc-600">Заявки на подтверждение участка и контакты</p>
        </div>
      </div>
      {!canWriteRegistry ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" data-testid="office-registry-readonly-hint">
          Только просмотр
        </div>
      ) : null}

      <form className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 sm:grid-cols-4 sm:items-end" data-testid="office-registry-filters">
        <label className="text-sm text-zinc-700">
          <div className="text-xs font-semibold text-zinc-600">Улица</div>
          <select
            name="street"
            defaultValue={street ?? ""}
            data-testid="office-registry-filter-street"
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-[#5E704F] focus:outline-none"
          >
            <option value="">Все</option>
            {Array.from({ length: 27 }).map((_, idx) => (
              <option key={idx} value={idx + 1}>
                Улица {idx + 1}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-zinc-700">
          <div className="text-xs font-semibold text-zinc-600">Статус</div>
          <select
            name="status"
            defaultValue={statusParam}
            data-testid="office-registry-filter-status"
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-[#5E704F] focus:outline-none"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="sm:col-span-2 text-sm text-zinc-700">
          <div className="text-xs font-semibold text-zinc-600">Поиск</div>
=======
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { can, type Role } from "@/lib/permissions";
import { listRegistry } from "@/lib/registry.store";

type Props = {
  searchParams?: { q?: string };
};

const statusLabel: Record<string, string> = {
  verified: "Подтверждено",
  pending: "На проверке",
  draft: "Черновик",
};

const statusClass: Record<string, string> = {
  verified: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
  draft: "bg-zinc-100 text-zinc-700",
};

export default async function OfficeRegistryPage({ searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/office/registry");
  const role = (user?.role as Role | undefined) ?? "resident";
  const normalizedRole = role === "admin" ? "chairman" : role;
  if (!can(normalizedRole, "office.registry.manage") && !can(normalizedRole, "office.registry.read")) {
    redirect("/forbidden");
  }
  const q = searchParams?.q ?? "";
  const items = listRegistry({ q });

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm" data-testid="office-registry-root">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Реестр участков</h1>
          <p className="text-sm text-zinc-600">Данные по участкам и владельцам.</p>
        </div>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700">Всего: {items.length}</span>
      </div>

      <form className="mt-4 grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 sm:grid-cols-3">
        <label className="sm:col-span-2">
          <span className="text-xs font-semibold text-zinc-600">Поиск</span>
>>>>>>> 737c5be (codex snapshot)
          <input
            type="text"
            name="q"
            defaultValue={q}
<<<<<<< HEAD
            data-testid="office-registry-search"
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-[#5E704F] focus:outline-none"
            placeholder="ФИО, телефон или участок"
          />
        </label>
        <div className="sm:col-span-4">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4d5d41]"
=======
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-[#5E704F] focus:outline-none"
            placeholder="Участок, владелец, телефон"
          />
        </label>
        <div className="sm:col-span-1 sm:self-end">
          <button
            type="submit"
            className="w-full rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4d5d41]"
>>>>>>> 737c5be (codex snapshot)
          >
            Применить
          </button>
        </div>
      </form>

<<<<<<< HEAD
      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="min-w-full divide-y divide-zinc-200" data-testid="office-registry-table">
          <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
            <tr>
              <th className="px-3 py-2">Участок</th>
              <th className="px-3 py-2">ФИО</th>
              <th className="px-3 py-2">Телефон</th>
          <th className="px-3 py-2">Статус</th>
          <th className="px-3 py-2 text-right">Действия</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-200">
        {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-sm text-zinc-600">
                  Заявки не найдены.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} data-testid={`office-registry-row-${row.id}`} className="text-sm text-zinc-800">
                  <td className="px-3 py-2 font-semibold">
                    Улица {row.streetNo}, участок {row.plotLabel}
                  </td>
                  <td className="px-3 py-2">{row.fio}</td>
                  <td className="px-3 py-2">{row.phone}</td>
                  <td className="px-3 py-2">
                    <div className="space-y-1">
                      <div>
                        {row.status === "pending"
                          ? "На проверке"
                          : row.status === "verified"
                            ? "Подтверждено"
                            : row.status === "rejected"
                              ? "Отклонено"
                              : "Конфликт"}
                      </div>
                      {row.status === "conflict" ? (
                        <div
                          data-testid={`office-registry-conflict-${row.id}`}
                          className="inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700"
                        >
                          Конфликт: уже закреплён
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {canWriteRegistry && (row.status === "pending" || row.status === "conflict") ? (
                      <div className="flex justify-end gap-2" data-testid={`office-registry-edit-${row.id}`}>
                        <form action={verifyOwnershipAction}>
                          <input type="hidden" name="id" value={row.id} />
                          <button
                            type="submit"
                            data-testid={`office-registry-verify-${row.id}`}
                            disabled={row.status === "conflict" && !canWriteRegistry}
                            title={
                              row.status === "conflict" && !canWriteRegistry
                                ? "Подтверждать конфликт может только админ/председатель"
                                : undefined
                            }
                            className={`rounded-lg border px-3 py-1 text-xs font-semibold ${
                              row.status === "conflict" && !canWriteRegistry
                                ? "cursor-not-allowed border-zinc-200 text-zinc-400"
                                : "border-emerald-200 text-emerald-700 hover:border-emerald-300"
                            }`}
                          >
                            Подтвердить
                          </button>
                        </form>
                        <form action={rejectOwnershipAction}>
                          <input type="hidden" name="id" value={row.id} />
                          <button
                            type="submit"
                            data-testid={`office-registry-reject-${row.id}`}
                            className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 hover:border-rose-300"
                          >
                            Отклонить
                          </button>
                        </form>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-500">—</span>
                    )}
=======
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
              <th className="px-3 py-2">Участок</th>
              <th className="px-3 py-2">Владелец</th>
              <th className="px-3 py-2">Контакты</th>
              <th className="px-3 py-2">Статус</th>
              <th className="px-3 py-2">Обновлено</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-sm text-zinc-600">
                  Ничего не найдено по заданному запросу.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} data-testid="registry-row">
                  <td className="px-3 py-2 text-sm font-semibold text-[#5E704F]">
                    <Link href={`/office/registry/${item.id}`} className="hover:underline">
                      {item.plotNumber}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-sm text-zinc-800">{item.ownerName ?? "—"}</td>
                  <td className="px-3 py-2 text-sm text-zinc-700">
                    <div className="space-y-1">
                      {item.phone ? <div>{item.phone}</div> : null}
                      {item.email ? <div className="text-xs text-zinc-500">{item.email}</div> : null}
                      {!item.phone && !item.email ? <div className="text-xs text-zinc-500">Нет контактов</div> : null}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                        statusClass[item.status ?? "draft"] ?? "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      {statusLabel[item.status ?? "draft"] ?? "Черновик"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm text-zinc-600">
                    {new Date(item.updatedAt).toLocaleDateString("ru-RU")}
>>>>>>> 737c5be (codex snapshot)
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
