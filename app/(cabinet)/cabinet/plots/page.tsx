import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import {
  getUserOwnershipVerifications,
  reviewOwnershipVerification,
  type OwnershipVerification,
} from "@/lib/plots";

type OwnershipStatus = OwnershipVerification["status"];
type OwnershipReviewStatus = Extract<OwnershipStatus, "approved" | "rejected">;

function statusLabel(status: OwnershipStatus) {
  switch (status) {
    case "sent":
      return "На проверке";
    case "approved":
      return "Подтверждён";
    case "rejected":
      return "Отклонён";
    default:
      return "—";
  }
}

function statusTone(status: OwnershipStatus) {
  if (status === "approved") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "rejected") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-amber-50 text-amber-800 border-amber-200";
}

async function setStatus(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const isDev = process.env.NODE_ENV !== "production";
  if (!isDev && user.role !== "admin") redirect("/cabinet/plots");
  const id = (formData.get("id") as string | null) ?? "";
  const status = (formData.get("status") as OwnershipReviewStatus | null) ?? null;
  const reviewNote = (formData.get("reviewNote") as string | null) ?? null;
  if (!id || !status) redirect("/cabinet/plots");
  try {
    await reviewOwnershipVerification({ id, status, reviewNote });
    redirect("/cabinet/plots");
  } catch {
    redirect("/cabinet/plots?error=storage");
  }
}

export default async function CabinetPlotsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "user" && user.role !== "board")) {
    redirect("/login");
  }
  const isDev = process.env.NODE_ENV !== "production";
  const items = await getUserOwnershipVerifications(user.id ?? "");
  const submitted = typeof searchParams?.submitted === "string" ? searchParams.submitted === "1" : false;
  const error = typeof searchParams?.error === "string" ? searchParams.error : undefined;

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Мои участки</h1>
            <p className="text-sm text-zinc-600">Подайте заявку на подтверждение собственности.</p>
          </div>
          <Link
            href="/cabinet/plots/new"
            className="rounded-full bg-[#5E704F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4A5A3E]"
          >
            Добавить участок
          </Link>
        </div>

        {submitted && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Заявка отправлена. Ожидайте проверки правлением.
          </div>
        )}
        {error === "storage" && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Сервис заявок временно недоступен. Обратитесь в правление.
          </div>
        )}

        {items.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-600 shadow-sm">
            <p>Участки не добавлены.</p>
            <Link href="/cabinet/plots/new" className="mt-3 inline-block text-sm font-semibold text-[#5E704F] underline">
              Подтвердить участок
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Кадастровый номер</div>
                    <div className="text-sm font-semibold text-zinc-900">{item.cadastralNumber}</div>
                  </div>
                  <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${statusTone(item.status)}`}>
                    {statusLabel(item.status)}
                  </span>
                </div>
                {item.status === "rejected" && item.reviewNote && (
                  <div className="mt-2 text-xs text-rose-700">Причина: {item.reviewNote}</div>
                )}

                {(isDev || user.role === "admin") && (
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <form action={setStatus}>
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="status" value="approved" />
                      <button
                        type="submit"
                        className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 font-semibold text-emerald-700"
                      >
                        Одобрить (dev)
                      </button>
                    </form>
                    <form action={setStatus}>
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="status" value="rejected" />
                      <input type="hidden" name="reviewNote" value="Уточните данные у правления." />
                      <button
                        type="submit"
                        className="rounded-full border border-rose-300 bg-rose-50 px-3 py-1 font-semibold text-rose-700"
                      >
                        Отклонить (dev)
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
