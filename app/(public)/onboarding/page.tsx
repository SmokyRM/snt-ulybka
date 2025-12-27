import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSessionUser } from "@/lib/session.server";
import { getUserProfile, upsertUserProfileByUser } from "@/lib/userProfiles";
import { claimPlotByCode } from "@/lib/plots";
import { OnboardingForm } from "./OnboardingForm";

async function saveOnboarding(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user || (user.role !== "user" && user.role !== "board" && user.role !== "admin")) {
    redirect("/login");
  }
  if (user.role === "admin") {
    redirect("/admin");
  }
  const fullName = ((formData.get("fullName") as string | null) ?? "").trim();
  const phoneRaw = ((formData.get("phone") as string | null) ?? "").trim();
  const plotCode = ((formData.get("plotCode") as string | null) ?? "").trim().toUpperCase();
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

  if (!plotCode) {
    redirect("/onboarding?error=Нужен код участка");
  }
  // DEV ONLY: allow local testing without real plot binding.
  const isDev = process.env.NODE_ENV !== "production";
  const h = await Promise.resolve(headers());
  const host = h.get("host") ?? "";
  const isLocalhost = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  if (isDev && isLocalhost && plotCode === "PLOT111") {
    redirect("/cabinet");
  }
  const claimResult = await claimPlotByCode(plotCode, user.id ?? "");
  if (!claimResult.ok) {
    const reason =
      claimResult.reason === "taken"
        ? "Участок уже привязан. Обратитесь к владельцу или в правление."
        : claimResult.reason === "not_found"
          ? "Неверный код. Получите код у правления."
          : "Не удалось привязать участок. Попробуйте снова.";
    redirect(`/onboarding?error=${encodeURIComponent(reason)}`);
  }

  redirect("/cabinet");
}

export default async function OnboardingPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const user = await getSessionUser();
  if (!user || (user.role !== "user" && user.role !== "board" && user.role !== "admin")) {
    redirect("/login");
  }
  if (user.role === "admin") {
    redirect("/admin");
  }
  const profile = await getUserProfile(user.id ?? "");
  if (profile.fullName && profile.phone) {
    redirect("/cabinet");
  }

  const error = typeof searchParams?.error === "string" ? searchParams.error : null;

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-lg space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold">Давайте познакомимся</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Эти данные нужны, чтобы корректно показывать информацию по вашему участку.
          </p>
        </div>
        <OnboardingForm action={saveOnboarding} error={error} />
      </div>
    </main>
  );
}
