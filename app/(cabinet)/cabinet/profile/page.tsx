import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { getUserProfile } from "@/lib/userProfiles";
import { logAuthEvent } from "@/lib/structuredLogger/node";

function generateRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}-${Math.random().toString(36).substring(2, 11)}`;
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const user = await getSessionUser();
  if (!user) {
    const requestId = generateRequestId();
    logAuthEvent({
      action: "forbidden",
      path: "/cabinet/profile",
      role: null,
      userId: null,
      status: 401,
      latencyMs: 0,
      requestId,
      message: "Profile redirect to /login: no_session",
    });
    redirect("/login?next=/cabinet/profile");
  }
  
  const profile = await getUserProfile(user.id ?? "");
  const onboardingParam = params.onboarding;
  const isOnboarding = onboardingParam === "1" || (Array.isArray(onboardingParam) && onboardingParam[0] === "1");
  
  // Если это онбординг и профиль не заполнен — редирект только в /cabinet/onboarding/* (не в /admin, не в /onboarding)
  if (isOnboarding && (!profile.fullName || !profile.phone)) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[guard-redirect]", { path: "/cabinet/profile", role: user?.role ?? "n/a", reason: "onboarding.incomplete", redirectTo: "/cabinet/onboarding/profile" });
    }
    redirect("/cabinet/onboarding/profile");
  }
  
  // Если профиль заполнен или это не онбординг, показываем заглушку
  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-lg space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold">Профиль</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Профиль в разработке. Вы можете изменить свои данные на главной странице кабинета.
          </p>
        </div>
        <div className="space-y-3 text-sm text-zinc-800">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <div className="font-semibold text-zinc-900">ФИО</div>
            <div>{profile.fullName || "Не указано"}</div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <div className="font-semibold text-zinc-900">Телефон</div>
            <div>{profile.phone || "Не указано"}</div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <div className="font-semibold text-zinc-900">Email</div>
            <div>{profile.email || "Не указано"}</div>
          </div>
        </div>
        <Link
          href="/cabinet"
          className="block w-full rounded-full bg-[#5E704F] px-5 py-2 text-center text-sm font-semibold text-white hover:bg-[#4d5d41]"
        >
          В кабинет
        </Link>
      </div>
    </main>
  );
}
