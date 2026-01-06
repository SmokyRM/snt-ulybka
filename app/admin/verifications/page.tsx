import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { getAllOwnershipVerifications, type OwnershipVerification } from "@/lib/plots";
import { getUserProfile } from "@/lib/userProfiles";

const statusTabs = [
  { key: "sent", label: "На проверке" },
  { key: "rejected", label: "Отклонены" },
  { key: "approved", label: "Подтверждены" },
  { key: "all", label: "Все" },
];

const statusLabel = (status: string) => {
  if (status === "approved") return "Подтверждено";
  if (status === "rejected") return "Отклонено";
  return "На проверке";
};

const statusBadge = (status: string) => {
  if (status === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "rejected") return "border-rose-200 bg-rose-50 text-rose-800";
  return "border-amber-200 bg-amber-50 text-amber-800";
};

export default async function VerificationsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) {
    redirect("/login?next=/admin/verifications");
  }
  const statusParam = typeof params.status === "string" ? params.status : "sent";
  const allowedStatuses = ["sent", "rejected", "approved", "draft"] as const;
  const status = allowedStatuses.includes(statusParam as (typeof allowedStatuses)[number])
    ? (statusParam as OwnershipVerification["status"])
    : undefined;
  const items = await getAllOwnershipVerifications({ status, limit: 200 });
  const userIds = Array.from(new Set(items.map((item) => item.userId)));
  const profiles = await Promise.all(userIds.map((id) => getUserProfile(id)));
  const profileMap = new Map(profiles.map((profile) => [profile.userId, profile]));
  const updated = typeof params.updated === "string" ? params.updated : null;

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Проверка участков</h1>
          <Link
            href="/admin"
            className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
          >
            Назад
          </Link>
        </div>

        {updated ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Статус заявки обновлён.
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {statusTabs.map((tab) => (
            <Link
              key={tab.key}
              href={`/admin/verifications?status=${tab.key}`}
              className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                statusParam === tab.key
                  ? "border-[#5E704F] bg-[#5E704F] text-white"
                  : "border-zinc-300 text-zinc-700 hover:border-zinc-400"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
              Заявок нет.
            </div>
          ) : (
            items.map((item) => {
              const profile = profileMap.get(item.userId);
              const name = profile?.fullName || profile?.phone || "Пользователь";
              const createdAt = new Date(item.createdAt).toLocaleDateString("ru-RU");
              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-xs text-zinc-500">{createdAt}</div>
                      <div className="text-sm font-semibold text-zinc-900">{name}</div>
                      <div className="text-xs text-zinc-600">
                        Кадастровый: {item.cadastralNumber}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusBadge(
                          item.status,
                        )}`}
                      >
                        {statusLabel(item.status)}
                      </span>
                      <Link
                        href={`/admin/verifications/${item.id}`}
                        className="text-xs font-semibold text-[#5E704F] underline"
                      >
                        Открыть
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
