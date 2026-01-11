import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import CopyToClipboard from "@/components/CopyToClipboard";
import { getSessionUser } from "@/lib/session.server";
import { getUserPlots, getUserOwnershipVerifications } from "@/lib/plots";
import { getVerificationStatus } from "@/lib/verificationStatus";
import { getPaymentDetails } from "@/lib/paymentDetails";
import { getCabinetContext } from "@/lib/cabinetContext";

export const metadata = {
  title: "Оплата и долги — Личный кабинет",
};

const statusLabels: Record<string, string> = {
  pending: "На проверке",
  verified: "Подтверждено",
  rejected: "Отклонено",
  draft: "Черновик",
};

const paymentSteps = [
  "Проверьте реквизиты СНТ и назначение платежа.",
  "Оплатите в банке или онлайн-банке, указав свои данные и участок.",
  "Сохраните чек или скрин платежа на случай уточнений.",
  "Если нужен вопрос/подтверждение — напишите в правление.",
];

export default async function BillingPage() {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "user" && user.role !== "board")) {
    redirect("/login");
  }
  if (user.role === "admin") {
    const store = await Promise.resolve(cookies());
    const view = store.get("admin_view")?.value || "admin";
    if (view !== "user") redirect("/admin");
  }

  const userId = user.id ?? "";
  const [{ finance, hasDebt }, plots, verifications, paymentDetails] = await Promise.all([
    getCabinetContext(userId),
    getUserPlots(userId),
    getUserOwnershipVerifications(userId),
    getPaymentDetails(),
  ]);
  const { status } = getVerificationStatus(plots, verifications);
  const statusLabel = statusLabels[status] ?? "—";
  const hasMembershipDebt = (finance.membershipDebt ?? 0) > 0;
  const hasElectricityDebt = (finance.electricityDebt ?? 0) > 0;
  const debtFlag = hasDebt;

  const requisitesText = [
    paymentDetails.recipientName ? `Получатель: ${paymentDetails.recipientName}` : "",
    paymentDetails.inn || paymentDetails.kpp ? `ИНН/КПП: ${paymentDetails.inn} / ${paymentDetails.kpp}` : "",
    paymentDetails.account ? `Р/с: ${paymentDetails.account}` : "",
    paymentDetails.bank ? `Банк: ${paymentDetails.bank}` : "",
    paymentDetails.bik ? `БИК: ${paymentDetails.bik}` : "",
    paymentDetails.corrAccount ? `Корр. счёт: ${paymentDetails.corrAccount}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const hasRequisites = requisitesText.trim().length > 0 && !requisitesText.includes("—");

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header className="space-y-2">
          <div className="text-xs text-zinc-500">
            <Link href="/cabinet" className="hover:text-[#5E704F] hover:underline">
              Личный кабинет
            </Link>{" "}
            → Оплата и долги
          </div>
          <h1 className="text-2xl font-semibold">Оплата и долги</h1>
          <p className="text-sm text-zinc-600">
            Коротко о статусе и шагах оплаты. Без сумм — только факты и ссылки.
          </p>
        </header>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Сводка</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
              <div className="text-xs text-zinc-500">Статус доступа</div>
              <div className="text-sm font-semibold text-zinc-900">{statusLabel}</div>
            </div>
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
              <div className="text-xs text-zinc-500">Задолженность</div>
              <div className="text-sm font-semibold text-zinc-900">
                {debtFlag ? "Есть" : "Нет"}
                {debtFlag ? (
                  <span className="ml-2 text-xs font-normal text-zinc-600">
                    {[
                      hasMembershipDebt ? "взносы" : null,
                      hasElectricityDebt ? "электроэнергия" : null,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Как оплатить
          </div>
          <ul className="mt-3 space-y-2 text-sm text-zinc-700">
            {paymentSteps.map((step) => (
              <li key={step} className="flex gap-2">
                <span className="text-[#5E704F]">•</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <Link
              href="/knowledge/fees-basics"
              className="rounded-full border border-zinc-200 px-3 py-1 text-zinc-700 transition hover:border-[#5E704F] hover:text-[#5E704F]"
            >
              Статья: оплата взносов
            </Link>
            <Link
              href="/docs"
              className="rounded-full border border-zinc-200 px-3 py-1 text-zinc-700 transition hover:border-[#5E704F] hover:text-[#5E704F]"
            >
              Документы
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Реквизиты
              </div>
              <p className="mt-1 text-sm text-zinc-700">
                Используйте при оплате взносов и электроэнергии.
              </p>
            </div>
            {hasRequisites ? <CopyToClipboard text={requisitesText} /> : null}
          </div>
          {hasRequisites ? (
            <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-sm text-zinc-800">
              {requisitesText}
            </pre>
          ) : (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Реквизиты уточняются. Посмотрите инструкцию по оплате или свяжитесь с правлением.
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Если не согласны с начислением
          </div>
          <p className="mt-1 text-sm text-zinc-700">
            Можно уточнить начисление или отправить обращение.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <Link
              href="/cabinet/templates/claim"
              className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-[#5E704F] transition hover:border-[#5E704F]"
            >
              Шаблон претензии
            </Link>
            <Link
              href="/cabinet/templates/appeal"
              className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-[#5E704F] transition hover:border-[#5E704F]"
            >
              Обращение в правление
            </Link>
            <Link
              href="/cabinet/templates"
              className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-[#5E704F] transition hover:border-[#5E704F]"
            >
              Все шаблоны
            </Link>
          </div>
        </section>

        <div className="flex flex-wrap gap-4 text-xs font-semibold text-[#5E704F] underline">
          <Link href="/cabinet">← Вернуться в кабинет</Link>
          <Link href="/">← На главную</Link>
        </div>
      </div>
    </main>
  );
}
