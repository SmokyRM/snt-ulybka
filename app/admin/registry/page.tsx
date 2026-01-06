import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { listPlotsWithFilters } from "@/lib/mockDb";
import RegistryTableClient from "./RegistryTableClient";
import RegistryImportModalClient from "./RegistryImportModalClient";
import RegistryFiltersClient from "./RegistryFiltersClient";

export default async function RegistryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) {
    redirect("/login?next=/admin");
  }

  const query = typeof params.query === "string" ? params.query : "";
  const statusRaw = typeof params.status === "string" ? params.status : "";
  const allowedStatuses = ["DRAFT", "INVITE_READY", "CLAIMED", "VERIFIED"] as const;
  const status: (typeof allowedStatuses)[number] | null = allowedStatuses.includes(
    statusRaw as (typeof allowedStatuses)[number]
  )
    ? (statusRaw as (typeof allowedStatuses)[number])
    : null;
  const page = Number((params.page as string | undefined) || "1");
  const statusParam = status ?? "";
  const { items, total, pageSize } = listPlotsWithFilters({
    query,
    status,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: 20,
  });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Реестр участков</h1>
          <Link
            href="/admin"
            className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
          >
            Назад
          </Link>
        </div>

        <div className="space-y-2">
          <RegistryFiltersClient initialQuery={query} initialStatus={statusParam} />
          <div className="flex flex-wrap gap-2">
            <Link
              href="/api/admin/registry/template"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
            >
              Скачать шаблон
            </Link>
            <RegistryImportModalClient />
            <Link
              href="/api/admin/registry/export.csv"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
            >
              Экспорт
            </Link>
          </div>
        </div>

        <RegistryTableClient plots={items} query={query} status={statusParam} />

        <div className="flex items-center justify-between text-sm text-zinc-700">
          <div>
            Страница {page} из {totalPages} (всего {total})
          </div>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/registry?query=${encodeURIComponent(query)}&status=${encodeURIComponent(statusParam)}&page=${page - 1}`}
                className="rounded border border-zinc-300 px-3 py-1 hover:bg-зinc-100"
              >
                Назад
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/registry?query=${encodeURIComponent(query)}&status=${encodeURIComponent(statusParam)}&page=${page + 1}`}
                className="rounded border border-зinc-300 px-3 py-1 hover:bg-зinc-100"
              >
                Вперёд
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
