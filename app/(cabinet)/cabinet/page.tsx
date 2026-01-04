import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { OFFICIAL_CHANNELS } from "@/config/officialChannels";
import { PUBLIC_CONTENT_DEFAULTS } from "@/lib/publicContentDefaults";
import {
  acceptDelegateInvite,
  clearDelegate,
  generateDelegateInvite,
  getPlots,
  getUserOwnershipVerifications,
  getUserPlots,
} from "@/lib/plots";
import { createAppeal, getUserAppeals } from "@/lib/appeals";
import { getUserFinanceInfo } from "@/lib/getUserFinanceInfo";
import { getUserElectricity, getUserElectricityHistory, submitReading } from "@/lib/electricity";
import { getUnreadCount, getUserEvents, markAllRead, markEventRead } from "@/lib/userEvents";
import { getPaymentDetails } from "@/lib/paymentDetails";
import { getUserFinanceHistory } from "@/lib/financeHistory";
import { getUserCharges } from "@/lib/charges";
import { acknowledgeDoc, getRequiredDocsForUser } from "@/lib/requiredDocs";
import { getDecisions } from "@/lib/decisions";
import { getLatestMembershipRequestForUser, getMembershipStatus, submitMembershipRequest } from "@/lib/membership";
import { getUserProfile, upsertUserProfileByUser } from "@/lib/userProfiles";
import { getUserPreferences, setActivePlot } from "@/lib/userPreferences";
import { submitPlotProposal } from "@/lib/plots";
import { createCodeRequest } from "@/lib/codeRequests";
import { CabinetShell, type SectionKey } from "./CabinetShell";
import { PaymentPurposeClient } from "./PaymentPurposeClient";
import { getVerificationStatus } from "@/lib/verificationStatus";

const logCabinetError = (label: string, error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`[cabinet] ${label} failed`, message);
};

async function safeFetch<T>(
  label: string,
  fallback: T,
  fn: () => Promise<T>,
  errors: string[],
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    logCabinetError(label, error);
    errors.push(label);
    return fallback;
  }
}

async function submitAppeal(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "user" && user.role !== "board")) {
    redirect("/login");
  }
  const membership = await getMembershipStatus(user.id ?? "");
  if (membership.status !== "member") {
    redirect("/cabinet?locked=1");
  }
  if (user.role === "admin") {
    const store = await Promise.resolve(cookies());
    const view = store.get("admin_view")?.value || "admin";
    if (view !== "user") redirect("/admin");
  }
  const text = (formData.get("appeal") as string | null) ?? "";
  await createAppeal(user.id ?? "", text);
  redirect("/cabinet?section=appeals");
}

async function submitElectricity(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "user" && user.role !== "board")) {
    redirect("/login");
  }
  const membership = await getMembershipStatus(user.id ?? "");
  if (membership.status !== "member") {
    redirect("/cabinet?locked=1");
  }
  if (user.role === "admin") {
    const store = await Promise.resolve(cookies());
    const view = store.get("admin_view")?.value || "admin";
    if (view !== "user") redirect("/admin");
  }
  const value = Number(formData.get("reading"));
  const plotId = (formData.get("plotId") as string | null) ?? null;
  const plotNumber = (formData.get("plotNumber") as string | null) ?? null;
  if (!Number.isFinite(value) || value < 0) redirect("/cabinet");
  await submitReading(user.id ?? "", value, plotId, plotNumber);
  redirect("/cabinet?section=electricity");
}

async function markEvent(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "user" && user.role !== "board")) {
    redirect("/login");
  }
  const membership = await getMembershipStatus(user.id ?? "");
  if (membership.status !== "member") {
    redirect("/cabinet?locked=1");
  }
  if (user.role === "admin") {
    const store = await Promise.resolve(cookies());
    const view = store.get("admin_view")?.value || "admin";
    if (view !== "user") redirect("/admin");
  }
  const id = formData.get("eventId") as string | null;
  if (!id) redirect("/cabinet");
  await markEventRead(user.id ?? "", id);
  redirect("/cabinet?section=events");
}

async function markAllEvents() {
  "use server";
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "user" && user.role !== "board")) {
    redirect("/login");
  }
  const membership = await getMembershipStatus(user.id ?? "");
  if (membership.status !== "member") {
    redirect("/cabinet?locked=1");
  }
  if (user.role === "admin") {
    const store = await Promise.resolve(cookies());
    const view = store.get("admin_view")?.value || "admin";
    if (view !== "user") redirect("/admin");
  }
  await markAllRead(user.id ?? "");
  redirect("/cabinet?section=events");
}

async function ackDoc(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "user" && user.role !== "board")) {
    redirect("/login");
  }
  const membership = await getMembershipStatus(user.id ?? "");
  if (membership.status !== "member") {
    redirect("/cabinet?locked=1");
  }
  if (user.role === "admin") {
    const store = await Promise.resolve(cookies());
    const view = store.get("admin_view")?.value || "admin";
    if (view !== "user") redirect("/admin");
  }
  const docId = formData.get("docId") as string | null;
  if (!docId) redirect("/cabinet");
  await acknowledgeDoc(user.id ?? "", docId);
  redirect("/cabinet?section=docs");
}

async function submitMembership(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "user" && user.role !== "board")) {
    redirect("/login");
  }
  const basis = ((formData.get("ownershipBasis") as string | null) ?? "OWNER").toUpperCase();
  const cadastralNumbers = formData
    .getAll("cadastralNumbers")
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v);
  if (cadastralNumbers.length === 0) {
    redirect("/cabinet?section=home");
  }
  const plots = cadastralNumbers.map((cad) => ({
    plotNumber: cad,
    street: null as string | null,
    cadastral: cad,
  }));
  const profile = await getUserProfile(user.id ?? "");
  if (!profile.fullName || !profile.phone) {
    redirect("/cabinet#profile");
  }
  await submitMembershipRequest({
    userId: user.id ?? "",
    fullName: profile.fullName ?? "",
    phone: profile.phone ?? "",
    plots,
    comment: `Основание: ${basis}`,
    proofType: "other",
  });
  redirect("/cabinet?section=home");
}

async function submitPlotProposalAction(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "user" && user.role !== "board")) {
    redirect("/login");
  }
  const plotId = (formData.get("plotId") as string | null) ?? "";
  const street = (formData.get("proposalStreet") as string | null) ?? "";
  const plotNumber = (formData.get("proposalPlotNumber") as string | null) ?? "";
  const cadastral = (formData.get("proposalCadastral") as string | null) ?? "";
  if (!plotId) redirect("/cabinet");
  await submitPlotProposal({
    userId: user.id ?? "",
    plotId,
    street: street || undefined,
    plotNumber: plotNumber || undefined,
    cadastral: cadastral || undefined,
  });
  redirect("/cabinet?section=home");
}

async function updateProfile(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "user" && user.role !== "board")) {
    redirect("/login");
  }
  if (user.role === "admin") {
    const store = await Promise.resolve(cookies());
    const view = store.get("admin_view")?.value || "admin";
    if (view !== "user") redirect("/admin");
  }
  const fullName = (formData.get("fullName") as string | null) ?? "";
  const phone = (formData.get("phone") as string | null) ?? "";
  await upsertUserProfileByUser(user.id ?? "", { fullName, phone });
  redirect("/cabinet?section=home");
}

async function setActivePlotAction(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "user" && user.role !== "board")) {
    redirect("/login");
  }
  if (user.role === "admin") {
    const store = await Promise.resolve(cookies());
    const view = store.get("admin_view")?.value || "admin";
    if (view !== "user") redirect("/admin");
  }
  const plotId = (formData.get("plotId") as string | null) ?? "";
  if (plotId) {
    await setActivePlot(user.id ?? "", plotId);
  }
  redirect("/cabinet?section=home");
}

async function createDelegateInviteAction(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "user" && user.role !== "board")) {
    redirect("/login");
  }
  const plotId = (formData.get("plotId") as string | null) ?? "";
  const allowReplace = (formData.get("allowReplace") as string | null) === "1";
  if (!plotId) redirect("/cabinet?section=home");
  const plots = await getPlots();
  const plot = plots.find((p) => p.plotId === plotId);
  const isAdmin = user.role === "admin" || user.role === "board";
  if (!plot || (!isAdmin && plot.ownerUserId !== user.id)) {
    redirect("/cabinet?section=home");
  }
  const result = await generateDelegateInvite({
    plotId,
    createdByUserId: user.id ?? "",
    isAdmin,
    allowReplace,
  });
  if (!result.ok) {
    const reason = result.reason ?? "error";
    redirect(`/cabinet?section=home&delegateError=${encodeURIComponent(reason)}`);
  }
  redirect(`/cabinet?section=home&delegateCode=${encodeURIComponent(result.token)}`);
}

async function acceptDelegateInviteAction(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "user" && user.role !== "board")) {
    redirect("/login");
  }
  const token = (formData.get("inviteToken") as string | null) ?? "";
  if (!token) redirect("/cabinet?section=home");
  const result = await acceptDelegateInvite({ token, userId: user.id ?? "" });
  if (!result.ok) {
    redirect(`/cabinet?section=home&delegateError=${encodeURIComponent(result.reason)}`);
  }
  redirect("/cabinet?section=home");
}

async function clearDelegateAction(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "user" && user.role !== "board")) {
    redirect("/login");
  }
  const plotId = (formData.get("plotId") as string | null) ?? "";
  if (!plotId) redirect("/cabinet?section=home");
  const plots = await getPlots();
  const plot = plots.find((p) => p.plotId === plotId);
  const isAdmin = user.role === "admin" || user.role === "board";
  if (!plot || (!isAdmin && plot.ownerUserId !== user.id)) {
    redirect("/cabinet?section=home");
  }
  await clearDelegate(plotId);
  redirect("/cabinet?section=home");
}

async function submitCodeRequest(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "user" && user.role !== "board")) {
    redirect("/login");
  }
  const display = (formData.get("plot_display") as string | null)?.trim() || "";
  const cadastral = (formData.get("cadastral_number") as string | null)?.trim() || "";
  const comment = (formData.get("comment") as string | null)?.trim() || "";
  if (!display) {
    redirect("/cabinet?section=home");
  }
  await createCodeRequest({
    userId: user.id ?? "",
    plotDisplay: display,
    cadastralNumber: cadastral || null,
    comment: comment || null,
  });
  redirect("/cabinet?section=home&codeRequest=sent");
}

export default async function CabinetPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "user" && user.role !== "board")) {
    redirect("/login");
  }
  if (user.role === "admin") {
    const store = await Promise.resolve(cookies());
    const view = store.get("admin_view")?.value || "admin";
    if (view !== "user") redirect("/admin");
  }

  const nowIso = new Date().toISOString();
  const dataErrors: string[] = [];
  const userId = user.id ?? "";
  const userPlots = await safeFetch("userPlots", [], () => getUserPlots(userId), dataErrors);
  const ownershipVerifications = await safeFetch(
    "ownershipVerifications",
    [],
    () => getUserOwnershipVerifications(userId),
    dataErrors,
  );
  const prefs = await safeFetch(
    "userPreferences",
    { userId, activePlotId: null, updatedAt: nowIso },
    () => getUserPreferences(userId),
    dataErrors,
  );
  const userPlot = userPlots.find((p) => p.plotId === prefs.activePlotId) || userPlots.find((p) => p.linkStatus === "active") || userPlots[0] || null;
  const membership = await safeFetch(
    "membershipStatus",
    { userId, status: "unknown", updatedAt: nowIso, updatedBy: "system", notes: null },
    () => getMembershipStatus(userId),
    dataErrors,
  );
  let profile = await safeFetch(
    "userProfile",
    {
      userId,
      fullName: null,
      phone: null,
      email: null,
      cadastralNumbers: [],
      updatedAt: nowIso,
      updatedBy: "system",
    },
    () => getUserProfile(userId),
    dataErrors,
  );
  const latestRequest = await safeFetch(
    "latestMembershipRequest",
    null,
    () => getLatestMembershipRequestForUser(userId),
    dataErrors,
  );
  const activeRequestHasContacts =
    latestRequest?.status === "new" && !!latestRequest.fullName && !!latestRequest.phone;
  if (
    (!profile.fullName || !profile.phone) &&
    activeRequestHasContacts
  ) {
    try {
      await upsertUserProfileByUser(userId, { fullName: latestRequest.fullName, phone: latestRequest.phone });
      profile = await safeFetch(
        "userProfileRefresh",
        profile,
        () => getUserProfile(userId),
        dataErrors,
      );
    } catch (error) {
      logCabinetError("userProfileUpdate", error);
      dataErrors.push("userProfileUpdate");
    }
  }
  const profileComplete = Boolean(profile.fullName && profile.phone);

  const appeals = await safeFetch("appeals", [], () => getUserAppeals(userId), dataErrors);
  const finance = await safeFetch(
    "financeInfo",
    { membershipDebt: null, electricityDebt: null, status: "unknown" },
    () => getUserFinanceInfo(userId),
    dataErrors,
  );
  const electricity = await safeFetch(
    "electricity",
    null,
    () => getUserElectricity(userId, userPlot?.plotId ?? null),
    dataErrors,
  );
  const paymentDetails = await safeFetch(
    "paymentDetails",
    {
      recipientName: "—",
      inn: "—",
      kpp: "—",
      account: "—",
      bank: "—",
      bik: "—",
      corrAccount: "—",
    },
    () => getPaymentDetails(),
    dataErrors,
  );
  const events = await safeFetch("userEvents", [], () => getUserEvents(userId, 10), dataErrors);
  const unreadCount = await safeFetch("unreadCount", 0, () => getUnreadCount(userId), dataErrors);
  const electricityHistory = await safeFetch(
    "electricityHistory",
    [],
    () => getUserElectricityHistory(userId, 6, userPlot?.plotId ?? null),
    dataErrors,
  );
  const financeHistory = await safeFetch(
    "financeHistory",
    [],
    () => getUserFinanceHistory(userId, 6),
    dataErrors,
  );
  const requiredDocs = await safeFetch(
    "requiredDocs",
    [],
    () =>
      getRequiredDocsForUser({
        userId,
        membershipStatus:
          membership.status === "member"
            ? "member"
            : membership.status === "non-member"
              ? "non-member"
              : "unknown",
      }),
    dataErrors,
  );
  const charges = await safeFetch("charges", [], () => getUserCharges(userId), dataErrors);
  const decisions = await safeFetch("decisions", [], () => getDecisions(), dataErrors);
  const decisionMap = new Map(decisions.map((d) => [d.id, d]));
  const userPlotMap = new Map(userPlots.map((p) => [p.plotId, p]));
  if (dataErrors.length > 0) {
    console.error("[cabinet] data fetch errors", dataErrors);
  }

  const hasAnyFinanceData = finance.membershipDebt !== null || finance.electricityDebt !== null;
  const plotsCount = userPlots.length;
  const verificationsApproved = ownershipVerifications.filter((v) => v.status === "approved").length;
  const verificationsSent = ownershipVerifications.filter((v) => v.status === "sent").length;
  const verificationsRejected = ownershipVerifications.filter((v) => v.status === "rejected").length;
  const { status, latest } = getVerificationStatus(userPlots, ownershipVerifications);
  const latestRejectedNote = latest?.status === "rejected" ? latest.reviewNote : null;
  const hasPlots = userPlots.length > 0;
  const isConfirmed = status === "verified";
  const isBlocked = membership.status === "non-member" && status === "rejected";
  const contactEmail = PUBLIC_CONTENT_DEFAULTS.contacts.email;
  const contactLinks = [
    OFFICIAL_CHANNELS.telegram ? { label: "Telegram", href: OFFICIAL_CHANNELS.telegram } : null,
    contactEmail ? { label: "Почта", href: `mailto:${contactEmail}` } : null,
    { label: "Контакты", href: "/contacts" },
  ].filter(Boolean) as Array<{ label: string; href: string }>;

  const homeSection = (
    <div className="space-y-4">
      {dataErrors.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 shadow-sm">
          Данные временно недоступны. Попробуйте обновить страницу позже.
        </div>
      ) : null}

      {isBlocked ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">
            <div className="font-semibold">❌ Доступ закрыт</div>
            <p className="mt-1 text-sm text-rose-800">
              Мы не смогли подтвердить связь с участком СНТ. Если это ошибка — свяжитесь с правлением.
            </p>
          </div>
          <Link
            href="/security"
            className="text-xs text-zinc-500 transition hover:text-[#5E704F] hover:underline"
          >
            🔒 Безопасность и данные
          </Link>
          <Link
            href="/cabinet/verification"
            className="text-xs text-zinc-500 transition hover:text-[#5E704F] hover:underline"
          >
            Доступ → Проверка
          </Link>
          <div className="flex flex-wrap gap-2 text-xs text-zinc-600">
            {contactLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-700 transition hover:border-[#5E704F]/60 hover:text-[#5E704F]"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-800 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Доступ</div>
            {!profileComplete ? (
              <>
                <div className="mt-2 font-semibold text-zinc-900">🟡 Заполните профиль</div>
                <p className="mt-1 text-sm text-zinc-700">
                  Нужны ФИО и телефон, чтобы начать проверку участка.
                </p>
                <Link
                  href="/onboarding?next=/cabinet"
                  className="mt-3 inline-flex rounded-full bg-[#5E704F] px-4 py-2 text-xs font-semibold text-white"
                >
                  Заполнить профиль
                </Link>
              </>
            ) : !hasPlots ? (
              <>
                <div className="mt-2 font-semibold text-zinc-900">🟡 Добавьте участок</div>
                <p className="mt-1 text-sm text-zinc-700">
                  Укажите кадастровый номер, чтобы начать проверку.
                </p>
                <Link
                  href="/cabinet/plots/new"
                  className="mt-3 inline-flex rounded-full bg-[#5E704F] px-4 py-2 text-xs font-semibold text-white"
                >
                  Добавить участок
                </Link>
              </>
            ) : status === "draft" ? (
              <>
                <div className="mt-2 font-semibold text-zinc-900">🟡 Проверка не отправлена</div>
                <p className="mt-1 text-sm text-zinc-700">
                  Участок сохранён. Отправьте заявку на проверку.
                </p>
                <Link
                  href="/cabinet/plots/new"
                  className="mt-3 inline-flex rounded-full bg-[#5E704F] px-4 py-2 text-xs font-semibold text-white"
                >
                  Отправить на проверку
                </Link>
              </>
            ) : status === "pending" ? (
              <>
                <div className="mt-2 font-semibold text-sky-700">⏳ На проверке (1–2 рабочих дня)</div>
                <p className="mt-1 text-sm text-sky-800">
                  Мы проверяем информацию по участку. Обычно это занимает 1–2 рабочих дня.
                </p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500">
                  <Link href="/help#verification" className="hover:text-[#5E704F] hover:underline">
                    Как проходит проверка
                  </Link>
                  <Link href="/help" className="hover:text-[#5E704F] hover:underline">
                    Справка
                  </Link>
                </div>
              </>
            ) : status === "rejected" ? (
              <>
                <div className="mt-2 font-semibold text-amber-700">❌ Нужны уточнения</div>
                {latestRejectedNote ? (
                  <p className="mt-1 text-sm text-amber-800">{latestRejectedNote}</p>
                ) : (
                  <p className="mt-1 text-sm text-amber-800">
                    Проверьте данные и отправьте заявку повторно.
                  </p>
                )}
                <Link
                  href="/cabinet/plots/new"
                  className="mt-3 inline-flex rounded-full bg-[#5E704F] px-4 py-2 text-xs font-semibold text-white"
                >
                  Исправить и отправить
                </Link>
                <Link
                  href="/help"
                  className="mt-2 inline-flex text-xs text-zinc-500 hover:text-[#5E704F] hover:underline"
                >
                  Справка
                </Link>
              </>
            ) : (
              <>
                <div className="mt-2 font-semibold text-emerald-700">✅ Доступ открыт</div>
                <p className="mt-1 text-sm text-emerald-800">
                  Все разделы кабинета доступны.
                </p>
              </>
            )}
          </div>
          <Link
            href="/security"
            className="text-xs text-zinc-500 transition hover:text-[#5E704F] hover:underline"
          >
            🔒 Безопасность и данные
          </Link>

          <div className="grid gap-3 sm:grid-cols-3">
            <Link
              href="/cabinet?section=plots"
              className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-700 shadow-sm transition hover:border-[#5E704F]/40"
            >
              <div className="text-2xl">🏡</div>
              <div className="mt-2 font-semibold text-zinc-900">Мой участок</div>
              <p className="mt-1 text-xs text-zinc-600">Данные и статус по вашему участку.</p>
            </Link>
            <Link
              href="/cabinet?section=finance"
              className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-700 shadow-sm transition hover:border-[#5E704F]/40"
            >
              <div className="text-2xl">💰</div>
              <div className="mt-2 font-semibold text-zinc-900">Оплаты и взносы</div>
              <p className="mt-1 text-xs text-zinc-600">Начисления и история платежей.</p>
            </Link>
            <Link
              href="/cabinet?section=electricity"
              className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-700 shadow-sm transition hover:border-[#5E704F]/40"
            >
              <div className="text-2xl">⚡</div>
              <div className="mt-2 font-semibold text-zinc-900">Электроэнергия</div>
              <p className="mt-1 text-xs text-zinc-600">Показания и начисления.</p>
            </Link>
          </div>

          {isConfirmed ? (
            <p className="text-sm text-zinc-600">
              Всё в порядке. Если появятся начисления или уведомления — мы покажем их здесь.
            </p>
          ) : null}
        </>
      )}
    </div>
  );

  const electricitySection = (
    <div className="space-y-4" id="electricity-section">
      <h2 className="text-lg font-semibold text-zinc-900">Электроэнергия</h2>
      <div className="space-y-2 text-sm text-zinc-700">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
          <div className="font-semibold text-zinc-900">Последние показания</div>
          <div>{electricity?.lastReading != null ? electricity.lastReading : "Не переданы"}</div>
          <div className="text-xs text-zinc-600">
            Дата: {electricity?.lastReadingDate ? new Date(electricity.lastReadingDate).toLocaleString("ru-RU") : "—"}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
          <div className="font-semibold text-zinc-900">Статус</div>
          <div>{electricity?.lastReading != null ? "Переданы" : "Не переданы"}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
          <div className="font-semibold text-zinc-900">Долг</div>
          <div>{electricity?.debt == null ? "Нет данных" : `${electricity.debt} ₽`}</div>
        </div>
      </div>
      <form action={submitElectricity} className="mt-3 flex flex-col gap-2 text-sm">
        <label className="text-zinc-800">
          Передать показания
          <input
            type="number"
            name="reading"
            min={0}
            step="0.01"
            required
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="self-start rounded-full bg-[#5E704F] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#4d5d41]"
        >
          Отправить
        </button>
      </form>
    </div>
  );

  const financeSection = (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-zinc-900">Финансы</h2>
      <div className="space-y-2 text-sm text-zinc-700">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
          <div className="font-semibold text-zinc-900">Членские взносы</div>
          <div>
            {finance.membershipDebt === null
              ? "—"
              : finance.membershipDebt === 0
                ? "Задолженности нет"
                : `Задолженность: ${finance.membershipDebt} ₽`}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
          <div className="font-semibold text-zinc-900">Электроэнергия</div>
          <div>
            {finance.electricityDebt === null
              ? "—"
              : finance.electricityDebt === 0
                ? "Задолженности нет"
                : `Задолженность: ${finance.electricityDebt} ₽`}
          </div>
        </div>
        {(finance.membershipDebt !== null || finance.electricityDebt !== null) && (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <div className="font-semibold text-zinc-900">Итого</div>
            <div>
              Членские: {finance.membershipDebt === null ? "—" : `${finance.membershipDebt} ₽`}
            </div>
            <div>
              Электро: {finance.electricityDebt === null ? "—" : `${finance.electricityDebt} ₽`}
            </div>
          </div>
        )}
      </div>
      {!hasAnyFinanceData && (
        <p className="text-xs text-zinc-600">
          Данные уточняются. Если вы недавно купили участок или сменились данные — отправьте обращение.
        </p>
      )}
      <div className="space-y-2 text-sm text-zinc-700">
        <div className="font-semibold text-zinc-900">Оплата через банк</div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800">
          <div>Получатель: {paymentDetails.recipientName}</div>
          <div>ИНН/КПП: {paymentDetails.inn} / {paymentDetails.kpp}</div>
          <div>Р/с: {paymentDetails.account}</div>
          <div>Банк: {paymentDetails.bank}</div>
          <div>БИК: {paymentDetails.bik}</div>
          <div>Корр. счёт: {paymentDetails.corrAccount}</div>
        </div>
        <PaymentPurposeClient
          street={userPlot?.street ?? null}
          plotNumber={userPlot?.plotNumber ?? null}
          lastReading={electricity?.lastReading ?? null}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-800">
          <div className="font-semibold text-zinc-900">Электроэнергия (последние 6 мес.)</div>
          {electricityHistory.length === 0 ? (
            <div className="text-zinc-600">Нет данных</div>
          ) : (
            <ul className="mt-2 space-y-1">
              {electricityHistory.map((h) => (
                <li key={`${h.date}`} className="flex justify-between gap-3">
                  <span>{h.month || "—"}</span>
                  <span>{h.reading}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-800">
          <div className="font-semibold text-zinc-900">Взносы (последние 6 мес.)</div>
          {financeHistory.length === 0 ? (
            <div className="text-zinc-600">Нет данных</div>
          ) : (
            <ul className="mt-2 space-y-2">
              {financeHistory.map((f) => {
                const diff = f.charged - f.paid;
                return (
                  <li key={`${f.month}`} className="space-y-0.5">
                    <div className="flex justify-between gap-3">
                      <span>{f.month}</span>
                      <span>Начислено: {f.charged} ₽</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span>Оплачено: {f.paid} ₽</span>
                      <span>Разница: {diff} ₽</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );

  const chargesSection = (
    <div className="space-y-3" id="charges-section">
      <h2 className="text-lg font-semibold text-zinc-900">Начисления</h2>
      {charges.length === 0 ? (
        <p className="text-sm text-zinc-700">Начислений пока нет.</p>
      ) : (
        <div className="space-y-2 text-sm text-zinc-800">
          {charges.slice(0, 10).map((c) => {
            const decision = decisionMap.get(c.decisionId);
            const typeLabel =
              c.type === "membership"
                ? "Членские"
                : c.type === "target"
                  ? "Целевые"
                  : "Электроэнергия";
            const plotLabel = c.plotId ? userPlotMap.get(c.plotId ?? "") : null;
            return (
              <div key={c.id} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                <div className="flex justify-between">
                  <span>{c.period}</span>
                  <span className="font-semibold">{c.amount} ₽</span>
                </div>
                <div className="text-xs text-zinc-600">Тип: {typeLabel}</div>
                {plotLabel && (
                  <div className="text-xs text-zinc-600">
                    Участок: № {plotLabel.plotNumber}, {plotLabel.street}
                  </div>
                )}
                <div className="text-xs text-zinc-600">
                  Статус: {c.status === "paid" ? "Оплачено" : "Долг"}
                </div>
                <div className="mt-1 text-xs text-zinc-700">
                  {decision ? (
                    <>
                      Основание: {decision.title} ({decision.date}){" "}
                      <a
                        href={decision.docUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#5E704F] underline"
                      >
                        Открыть протокол
                      </a>
                    </>
                  ) : (
                    "Основание: не найдено"
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const docsSection = (
    <div className="space-y-4" id="docs-section">
      <h2 className="text-lg font-semibold text-zinc-900">Документы</h2>
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-900">Обязательные документы</h3>
        {requiredDocs.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-700">Нет обязательных документов.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {requiredDocs.map((d) => (
              <div key={d.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-800">
                <div className="font-semibold text-zinc-900">{d.title}</div>
                <div className="text-xs text-zinc-600">
                  Опубликовано: {new Date(d.publishedAt).toLocaleDateString("ru-RU")}
                </div>
                <a
                  href={d.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex text-xs font-semibold text-[#5E704F] underline"
                >
                  Открыть документ
                </a>
                <div className="mt-2 flex items-center justify-between text-xs text-zinc-700">
                  <div>
                    {d.acked ? `Ознакомлен: ${d.ackAt ? new Date(d.ackAt).toLocaleString("ru-RU") : ""}` : "Не ознакомлен"}
                  </div>
                  {!d.acked && (
                    <form action={ackDoc}>
                      <input type="hidden" name="docId" value={d.id} />
                      <button
                        type="submit"
                        className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-800 hover:border-zinc-400"
                      >
                        Я ознакомлен(а)
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Документы СНТ</h3>
            <p className="text-xs text-zinc-700">Устав, протоколы и решения в разделе документов.</p>
          </div>
          <Link
            href="/docs"
            className="inline-flex rounded-full border border-[#5E704F] px-4 py-2 text-xs font-semibold text-[#5E704F] transition-colors hover:bg-[#5E704F]/10"
          >
            Открыть документы
          </Link>
        </div>
      </div>
    </div>
  );

  const eventsSection = (
    <div className="space-y-3" id="events-section">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">Уведомления</h2>
        {events.length > 0 && (
          <form action={markAllEvents}>
            <button
              type="submit"
              className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-800 hover:border-zinc-400"
            >
              Отметить всё прочитанным
            </button>
          </form>
        )}
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-zinc-700">Пока нет новых уведомлений.</p>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => (
            <div key={ev.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-zinc-900">{ev.title}</div>
                  <div className="text-sm text-zinc-700">{ev.text}</div>
                  <div className="text-xs text-zinc-600">
                    {new Date(ev.createdAt).toLocaleString("ru-RU")}
                  </div>
                  {ev.readAt == null && (
                    <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                      Новое
                    </span>
                  )}
                </div>
                {ev.readAt == null && (
                  <form action={markEvent}>
                    <input type="hidden" name="eventId" value={ev.id} />
                    <button
                      type="submit"
                      className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-800 hover:border-zinc-400"
                    >
                      Отметить прочитанным
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const appealsSection = (
    <div className="space-y-3" id="appeals-section">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900">Обращения</h2>
        <Link href="/admin/appeals" className="text-xs font-semibold text-[#5E704F] underline">
          Админка обращений
        </Link>
      </div>
      <form action={submitAppeal} className="space-y-3">
        <label className="block text-sm text-zinc-800">
          Текст обращения
          <textarea
            name="appeal"
            rows={3}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Опишите вопрос или проблему"
            required
          />
        </label>
        <button
          type="submit"
          className="rounded-full bg-[#5E704F] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#4d5d41]"
        >
          Отправить
        </button>
      </form>
      <div className="space-y-2 text-sm text-zinc-800">
        <div className="text-sm font-semibold text-zinc-900">Мои обращения</div>
        {appeals.length === 0 ? (
          <p className="text-sm text-zinc-600">Обращений пока нет.</p>
        ) : (
          <ul className="space-y-2">
            {appeals.map((a) => (
              <li key={a.id} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                <div className="flex items-center justify-between text-xs text-zinc-600">
                  <span>{new Date(a.createdAt).toLocaleString("ru-RU")}</span>
                  <span>
                    {a.status === "new"
                      ? "Новый"
                      : a.status === "in_progress"
                        ? "В работе"
                        : "Отвечен"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-800">{a.text}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  const plotsSection = (
    <div id="plots-section" className="space-y-4 text-sm text-zinc-700">
      <p>Список ваших участков и статусы подтверждения.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white px-3 py-3">
          <div className="text-xs text-zinc-500">Участков</div>
          <div className="text-lg font-semibold text-zinc-900">{plotsCount}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white px-3 py-3">
          <div className="text-xs text-zinc-500">Заявки</div>
          <div className="mt-1 text-sm text-zinc-800">
            Подтверждено: {verificationsApproved}
          </div>
          <div className="text-sm text-zinc-800">На проверке: {verificationsSent}</div>
          <div className="text-sm text-zinc-800">Отклонено: {verificationsRejected}</div>
        </div>
      </div>
    </div>
  );

  const sections: { key: SectionKey; title: string; content: React.ReactNode }[] = [
    { key: "home", title: "Домой (ЛК)", content: homeSection },
  ];
  if (!isBlocked) {
    sections.push({ key: "plots", title: "Мои участки", content: plotsSection });
  }
  if (profileComplete && isConfirmed) {
    sections.push(
      { key: "electricity", title: "Электроэнергия", content: electricitySection },
      { key: "finance", title: "Финансы", content: financeSection },
      { key: "charges", title: "Начисления", content: chargesSection },
      { key: "appeals", title: "Обращения", content: appealsSection },
      { key: "docs", title: "Документы", content: docsSection },
      { key: "events", title: "Уведомления", content: eventsSection },
    );
  }

  const quickActions =
    profileComplete && isConfirmed
      ? [
          { key: "electricity" as SectionKey, title: "Передать показания", desc: "Электроэнергия", targetId: "electricity-section" },
          { key: "charges" as SectionKey, title: "Начисления", desc: "Основания и суммы", targetId: "charges-section" },
          { key: "appeals" as SectionKey, title: "Написать обращение", desc: "Вопросы правлению", targetId: "appeals-section" },
          { key: "docs" as SectionKey, title: "Документы", desc: "Устав и протоколы", targetId: "docs-section" },
        ]
      : [];

  const initialSection = (() => {
    const param = typeof searchParams?.section === "string" ? searchParams?.section : "home";
    const allowed: SectionKey[] = sections.map((s) => s.key);
    return allowed.includes(param as SectionKey) ? (param as SectionKey) : "home";
  })();

  return (
    <CabinetShell
      sections={sections}
      unreadCount={unreadCount}
      quickActions={quickActions}
      initialActive={initialSection}
      isImpersonating={Boolean(user.isImpersonating)}
    />
  );
}
