import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { getUserProfile, upsertUserProfileByAdmin } from "@/lib/userProfiles";
import { getMembershipStatus } from "@/lib/membership";
import { getUserPlots } from "@/lib/plots";

async function saveProfile(formData: FormData) {
  "use server";
  const admin = await getSessionUser();
  if (!hasAdminAccess(admin)) {
    redirect("/login?next=/admin");
  }
  const userId = ((formData.get("userId") as string | null) ?? "").trim();
  if (!userId) {
    redirect("/admin/users");
  }
  const fullName = (formData.get("fullName") as string | null) ?? "";
  const phone = (formData.get("phone") as string | null) ?? "";
  const email = (formData.get("email") as string | null) ?? "";
  await upsertUserProfileByAdmin(userId, { fullName, phone, email });
  redirect(`/admin/users?userId=${encodeURIComponent(userId)}`);
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const admin = await getSessionUser();
  if (!hasAdminAccess(admin)) {
    redirect("/login?next=/admin");
  }

  const userIdParam = typeof params.userId === "string" ? params.userId.trim() : "";
  const profile = userIdParam ? await getUserProfile(userIdParam) : null;
  const membership = userIdParam ? await getMembershipStatus(userIdParam) : null;
  const plots = userIdParam ? await getUserPlots(userIdParam) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">Пользователь</h1>
        <Link href="/admin" className="text-sm text-[#5E704F] hover:underline">
          ← В админку
        </Link>
      </div>

      <form className="flex flex-wrap items-center gap-3" action="/admin/users" method="get">
        <input
          type="text"
          name="userId"
          defaultValue={userIdParam}
          placeholder="userId"
          className="w-full max-w-sm rounded border border-zinc-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4d5d41]"
        >
          Открыть
        </button>
      </form>

      {userIdParam ? (
        profile ? (
          <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-700">userId: {userIdParam}</div>
            <div className="grid gap-3 text-sm text-zinc-800 sm:grid-cols-2">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                <div className="font-semibold text-zinc-900">ФИО</div>
                <div>{profile.fullName || "—"}</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                <div className="font-semibold text-zinc-900">Телефон</div>
                <div>{profile.phone || "—"}</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                <div className="font-semibold text-zinc-900">Email</div>
                <div>{profile.email || "—"}</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                <div className="font-semibold text-zinc-900">Статус членства</div>
                <div>{membership?.status ?? "unknown"}</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 sm:col-span-2">
                <div className="font-semibold text-zinc-900">Участки</div>
                {plots.length === 0 ? (
                  <div>Участки не привязаны</div>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {plots.map((p) => (
                      <li key={p.plotId}>
                        № {p.plotNumber}, {p.street} ({p.ownershipStatus})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-800">
              <div className="font-semibold text-zinc-900">Обновить профиль</div>
              <form action={saveProfile} className="mt-2 grid gap-2 sm:grid-cols-2">
                <input type="hidden" name="userId" value={userIdParam} />
                <input name="fullName" defaultValue={profile.fullName ?? ""} placeholder="ФИО" className="rounded border border-zinc-300 px-3 py-2" />
                <input name="phone" defaultValue={profile.phone ?? ""} placeholder="Телефон" className="rounded border border-zinc-300 px-3 py-2" />
                <input name="email" defaultValue={profile.email ?? ""} placeholder="Email" className="rounded border border-zinc-300 px-3 py-2" />
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="rounded bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4d5d41]"
                  >
                    Сохранить
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Профиль не найден</div>
        )
      ) : (
        <p className="text-sm text-zinc-600">Введите userId и откройте профиль.</p>
      )}
    </div>
  );
}
