import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { getUserProfile, upsertUserProfileByUser } from "@/lib/userProfiles";
import { OnboardingForm } from "./OnboardingForm";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { mapQaStageToPath } from "@/lib/qaCabinetStage.shared";
import { getQaCabinetStageFromCookies } from "@/lib/qaCabinetStage.server";

function generateRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}-${Math.random().toString(36).substring(2, 11)}`;
}

async function saveOnboarding(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  // Разрешаем онбординг для user, board, resident (жители) и admin
  const allowedRoles = ["user", "board", "resident", "admin"];
  if (!user || !allowedRoles.includes(user.role)) {
    const reason = !user ? "no_session" : `invalid_role:${user.role}`;
    const requestId = generateRequestId();
    logAuthEvent({
      action: "forbidden",
      path: "/onboarding",
      role: user?.role || null,
      userId: user?.id || null,
      status: 401,
      latencyMs: 0,
      requestId,
      message: `Onboarding redirect to /login: ${reason}`,
    });
    redirect("/login");
  }
  // Редирект в /admin только на STANDALONE /onboarding; при fromCabinet (из /cabinet) — никогда не редиректим в /admin.
  const fromCabinet = formData.get("fromCabinet") === "1";
  if (user.role === "admin" && !fromCabinet) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[guard-redirect]", { path: "/onboarding (saveOnboarding)", role: user.role, reason: "admin.skip_onboarding", redirectTo: "/admin" });
    }
    redirect("/admin");
  }
  const fullName = ((formData.get("fullName") as string | null) ?? "").trim();
  const phoneRaw = ((formData.get("phone") as string | null) ?? "").trim();
  if (!fullName || !phoneRaw) {
    redirect("/onboarding");
  }
  const phone = phoneRaw.replace(/\s+/g, "");
  const cadastralNumbers = formData
    .getAll("cadastralNumbers")
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v);

  await upsertUserProfileByUser(user.id ?? "", { fullName, phone });
  // Пока сохраняем кадастровые номера в профиле как справочные данные
  await upsertUserProfileByUser(user.id ?? "", { fullName, phone, cadastralNumbers });

  redirect("/cabinet");
}

export default async function OnboardingPage({
  searchParams,
  fromCabinet = false,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
  fromCabinet?: boolean;
}) {
  const params = (await searchParams) ?? {};
  const user = await getSessionUser();
  // Разрешаем онбординг для user, board, resident (жители) и admin
  const allowedRoles = ["user", "board", "resident", "admin"];
  if (!user || !allowedRoles.includes(user.role)) {
    const reason = !user ? "no_session" : `invalid_role:${user.role}`;
    const requestId = generateRequestId();
    logAuthEvent({
      action: "forbidden",
      path: "/onboarding",
      role: user?.role || null,
      userId: user?.id || null,
      status: 401,
      latencyMs: 0,
      requestId,
      message: `Onboarding redirect to /login: ${reason}`,
    });
    if (process.env.NODE_ENV !== "production") {
      console.log("[guard-redirect]", { path: "/onboarding", role: String(user?.role ?? "null"), reason, redirectTo: "/login" });
    }
    redirect("/login");
  }
  // Редирект в /admin только на STANDALONE /onboarding; при fromCabinet (из /cabinet) — /cabinet и /cabinet/* никогда не ведут в /admin.
  const fc = Array.isArray(params.fromCabinet) ? params.fromCabinet[0] : params.fromCabinet;
  const fromCabinetAny = fromCabinet || fc === "1" || fc === "true";
  if (user.role === "admin" && !fromCabinetAny) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[guard-redirect]", { path: "/onboarding", role: user.role, reason: "admin.skip_onboarding", redirectTo: "/admin" });
    }
    redirect("/admin");
  }
  const isDevEnv = process.env.NODE_ENV !== "production";
  const qaStage = isDevEnv ? await getQaCabinetStageFromCookies() : null;
  const qaPath = qaStage ? mapQaStageToPath(qaStage) : null;
  if (isDevEnv && qaStage && qaPath && !qaPath.startsWith("/onboarding")) {
    redirect(qaPath);
  }
  const profile = await getUserProfile(user.id ?? "");
  const bypassProfileCheck = isDevEnv && Boolean(qaStage);
  if (profile.fullName && profile.phone && !bypassProfileCheck) {
    redirect("/cabinet");
  }

  const error = typeof params.error === "string" ? params.error : null;

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-lg space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold">Давайте познакомимся</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Эти данные нужны для связи и доступа к информации по вашему участку.
          </p>
        </div>
        <OnboardingForm action={saveOnboarding} error={error} fromCabinet={fromCabinetAny} />
        <Link
          href="/cabinet/verification"
          className="text-xs text-zinc-500 transition hover:text-[#5E704F] hover:underline"
        >
          ← Вернуться к проверке
        </Link>
      </div>
    </main>
  );
}
