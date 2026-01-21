import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { createOwnershipVerification } from "@/lib/plots";
import { getUserProfile } from "@/lib/userProfiles";

const CADASTRAL_RE = /^\d{2}:\d{2}:\d{6,7}:\d{1,4}$/;

async function submitPlot(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "user" && user.role !== "board")) {
    redirect("/login");
  }
  const profile = await getUserProfile(user.id ?? "");
  if (!profile.fullName || !profile.phone) {
    redirect("/cabinet/onboarding/profile");
  }
  const cadastralNumber = ((formData.get("cadastralNumber") as string | null) ?? "").trim();
  const file = formData.get("document") as File | null;
  const hasFile = Boolean(file && typeof file.size === "number" && file.size > 0);
  if (!cadastralNumber) redirect("/cabinet/plots/new?error=missing");
  if (!CADASTRAL_RE.test(cadastralNumber)) redirect("/cabinet/plots/new?error=format");
  if (hasFile && file && typeof file.size === "number" && file.size > 10 * 1024 * 1024) {
    redirect("/cabinet/plots/new?error=size");
  }
  let created = null;
  try {
    created = await createOwnershipVerification({
      userId: user.id ?? "",
      cadastralNumber,
      documentMeta: {
        name: file?.name || "без документа",
        size: file?.size ?? 0,
        type: file?.type || "none",
        lastModified: typeof file?.lastModified === "number" ? file.lastModified : null,
      },
      status: hasFile ? "sent" : "draft",
    });
  } catch {
    redirect("/cabinet/plots/new?error=storage");
  }
  if (created?.status === "approved") {
    redirect("/cabinet/plots/new?error=approved");
  }
  redirect("/cabinet/verification");
}

function errorMessage(code?: string) {
  switch (code) {
    case "missing":
      return "Укажите кадастровый номер.";
    case "format":
      return "Проверьте формат кадастрового номера (например 74:12:1234567:89).";
    case "size":
      return "Файл должен быть не больше 10 МБ.";
    case "storage":
      return "Сервис заявок временно недоступен. Обратитесь в правление.";
    case "approved":
      return "Этот участок уже подтверждён. Он доступен в списке ваших участков.";
    default:
      return "";
  }
}

export default async function PlotRequestPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const error = typeof params.error === "string" ? params.error : undefined;
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "user" && user.role !== "board")) {
    redirect("/login");
  }
  const profile = await getUserProfile(user.id ?? "");
  if (!profile.fullName || !profile.phone) {
    redirect("/cabinet/onboarding/profile");
  }

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-lg space-y-6">
        <div className="space-y-1">
          <div className="text-xs text-zinc-500">
            <Link href="/cabinet" className="hover:text-[#5E704F] hover:underline">
              Личный кабинет
            </Link>{" "}
            → Добавить участок
          </div>
          <h1 className="text-2xl font-semibold">Добавить участок</h1>
          <p className="text-sm text-zinc-600">
            Документы могут понадобиться только при необходимости.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage(error)}
          </div>
        )}

        <form action={submitPlot} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <label className="block text-sm font-medium text-zinc-800">
            Кадастровый номер
            <input
              name="cadastralNumber"
              placeholder="74:12:1234567:89"
              className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
              required
            />
          </label>

          <label className="block text-sm font-medium text-zinc-800">
            Документ (если попросили / при необходимости)
            <input
              type="file"
              name="document"
              accept=".pdf,.png,.jpg,.jpeg"
              className="mt-2 w-full text-sm"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4A5A3E]"
          >
            Сохранить участок
          </button>
        </form>

        <Link href="/cabinet/plots" className="text-xs font-semibold text-[#5E704F] underline">
          ← Назад к списку
        </Link>
      </div>
    </main>
  );
}
