import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { getUserProfile, upsertUserProfileByUser } from "@/lib/userProfiles";
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

export default async function OnboardingPage() {
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

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-lg space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold">Добро пожаловать!</h1>
          <p className="mt-2 text-sm text-zinc-600">Укажите контакты и участки, чтобы перейти в личный кабинет.</p>
        </div>
        <OnboardingForm action={saveOnboarding} />
      </div>
    </main>
  );
}
