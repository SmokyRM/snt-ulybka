import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";

export const dynamic = "force-dynamic";
import { OFFICIAL_CHANNELS } from "@/config/officialChannels";
import { PUBLIC_CONTENT_DEFAULTS } from "@/lib/publicContentDefaults";
import {
  getUserOwnershipVerifications,
  getUserPlots,
} from "@/lib/plots";
import { createAppeal, getUserAppeals } from "@/lib/appeals";
import { getUserElectricity, getUserElectricityHistory, submitReading } from "@/lib/electricity";
import { getUserEvents, markAllRead, markEventRead } from "@/lib/userEvents";
import { getPaymentDetails } from "@/lib/paymentDetails";
import { getUserFinanceHistory } from "@/lib/financeHistory";
import { getUserCharges } from "@/lib/charges";
import { acknowledgeDoc, getRequiredDocsForUser } from "@/lib/requiredDocs";
import { getDecisions } from "@/lib/decisions";
import { getLatestMembershipRequestForUser, getMembershipStatus } from "@/lib/membership";
import { getUserProfile, upsertUserProfileByUser } from "@/lib/userProfiles";
import { getUserPreferences } from "@/lib/userPreferences";
import { getSntSettings } from "@/lib/sntSettings";
import { listPublishedForAudience } from "@/lib/announcementsStore";
import { CabinetShell, type SectionKey } from "./CabinetShell";
import { PaymentPurposeClient } from "./PaymentPurposeClient";
import { getVerificationStatus } from "@/lib/verificationStatus";
import CopyToClipboard from "@/components/CopyToClipboard";
import { redirectToCabinetStep } from "@/lib/cabinetRedirect";
import RecentAnnouncements from "@/components/RecentAnnouncements";
import { getCabinetContext } from "@/lib/cabinetContext";
import { qaEnabled } from "@/lib/qaScenario";
import { mapQaStageToPath, type QaCabinetStage } from "@/lib/qaCabinetStage.shared";
import { getQaCabinetStageFromCookies, readQaCabinetMockEnabled } from "@/lib/qaCabinetStage.server";
import CabinetDevPanel from "./CabinetDevPanel";
import {
  SubmitElectricityButton,
  SubmitAppealButton,
  MarkEventButton,
  MarkAllEventsButton,
  AckDocButton,
} from "./CabinetFormButtons";
import { CABINET_LAB_STAGES } from "../../admin/qa/cabinet-lab/stages";
import { getQaCabinetMockData } from "../../cabinet/_dev/qaMockData";
import CabinetDashboard from "../../cabinet/_components/CabinetDashboard";
import { CabinetHeader } from "../../cabinet/_components/CabinetHeader";
import { getCabinetHeaderInfo } from "../../cabinet/_components/headerInfo";
import { readOnboardingStateFromCookies } from "../../cabinet/_components/onboardingState";

const logCabinetError = (label: string, error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`[cabinet] ${label} failed`, message);
};

const formatMonthYear = (value: Date) => {
  const raw = value
    .toLocaleDateString("ru-RU", { month: "long", year: "numeric" })
    .replace(" г.", "");
  if (!raw) return "—";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
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
  const value = Number(formData.get("reading"));
  const plotId = (formData.get("plotId") as string | null) ?? null;
  const plotNumber = (formData.get("plotNumber") as string | null) ?? null;
  if (!Number.isFinite(value) || value < 0) {
    redirect("/cabinet?section=electricity&electricityError=reading");
  }
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
  const docId = formData.get("docId") as string | null;
  if (!docId) redirect("/cabinet");
  await acknowledgeDoc(user.id ?? "", docId);
  redirect("/cabinet?section=docs");
}

export async function CabinetStageRenderer({
  searchParams,
  stageOverride = null,
  isLabPreview = false,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
  stageOverride?: QaCabinetStage | null;
  /** В Lab (/admin/qa/cabinet-lab) не делаем редиректы: ни на qaPath, ни redirectToCabinetStep. */
  isLabPreview?: boolean;
}) {
  const sp = (await Promise.resolve(searchParams)) ?? {};
  const user = await getSessionUser();
  if (!user) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[guard-redirect]", { path: "/cabinet", role: "n/a", reason: "no_session", redirectTo: "/login" });
    }
    redirect("/login?next=/cabinet");
  }
  const role = (user.role as "admin" | "chairman" | "secretary" | "accountant" | "resident" | "user" | "board" | undefined) ?? "resident";
  const { can, getForbiddenReason } = await import("@/lib/rbac");
  const normalizedRole: "admin" | "chairman" | "secretary" | "accountant" | "resident" = 
    role === "user" || role === "board" ? "resident" : role;
  const isDevEnv = process.env.NODE_ENV !== "production";
  // Проверяем RBAC доступ первым делом
  if (!can(normalizedRole, "cabinet.access")) {
    const reason = getForbiddenReason(normalizedRole, "cabinet.access");
    if (isDevEnv) {
      console.log("[guard-redirect]", { path: "/cabinet", role: String(normalizedRole), reason, redirectTo: "/forbidden" });
    }
    redirect(`/forbidden?reason=${encodeURIComponent(reason)}&next=${encodeURIComponent("/cabinet")}`);
  }
  // /cabinet НЕ редиректит в /admin. Admin может открывать /cabinet для QA.

  const stageFromOverride = stageOverride && CABINET_LAB_STAGES.includes(stageOverride) ? stageOverride : null;
  const qaStage: QaCabinetStage | null = stageFromOverride ?? (isDevEnv ? await getQaCabinetStageFromCookies() : null);
  const qaMockEnabled = isDevEnv && (await readQaCabinetMockEnabled());
  const qaPath = qaStage ? mapQaStageToPath(qaStage) : null;
  const shouldRedirectToQaPath = !isLabPreview && !stageOverride && isDevEnv && qaStage && qaPath && qaStage !== "cabinet_home";
  if (shouldRedirectToQaPath) {
    if (isDevEnv) {
      console.log("[guard-redirect]", { path: "/cabinet", role: String(normalizedRole), reason: "qa.stage", redirectTo: qaPath });
    }
    redirect(qaPath);
  }

  const headerInfo = await getCabinetHeaderInfo("Главная");

  const forceOnboarding = qaStage === "profile";
  if (!isLabPreview && !forceOnboarding && !(isDevEnv && qaStage)) {
    await redirectToCabinetStep(user.id ?? "");
  }

  if (isDevEnv) {
    const onboardingState = await readOnboardingStateFromCookies();
    // eslint-disable-next-line no-console
    console.info("[cabinet:dev] render", {
      env: process.env.NODE_ENV,
      stageOverride,
      qaStage,
      mock: qaMockEnabled,
      onboardingState: {
        step: onboardingState.step,
        completed: onboardingState.completed,
        hasDraft: Boolean(onboardingState.draft && Object.keys(onboardingState.draft).length > 0),
      },
    });
  }

  if (forceOnboarding) {
    const OnboardingPage = (await import("../../(public)/onboarding/page")).default;
    return <OnboardingPage searchParams={Promise.resolve({})} fromCabinet={true} />;
  }

  if (qaMockEnabled) {
    const mock = getQaCabinetMockData();
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-4 sm:px-6">
        <CabinetHeader
          title={headerInfo.title}
          statusLine={headerInfo.statusLine}
          progressLabel={headerInfo.progressLabel}
          progressHref={headerInfo.progressHref}
        />
        <CabinetDashboard mock={mock} />
      </div>
    );
  }

  const nowIso = new Date().toISOString();
  const dataErrors: string[] = [];
  const userId = user.id ?? "";
  let userPlots = await safeFetch("userPlots", [], () => getUserPlots(userId), dataErrors);
  let ownershipVerifications = await safeFetch(
    "ownershipVerifications",
    [],
    () => getUserOwnershipVerifications(userId),
    dataErrors,
  );
  let prefs = await safeFetch(
    "userPreferences",
    { userId, activePlotId: null, updatedAt: nowIso },
    () => getUserPreferences(userId),
    dataErrors,
  );
  let userPlot = userPlots.find((p) => p.plotId === prefs.activePlotId) || userPlots.find((p) => p.linkStatus === "active") || userPlots[0] || null;
  let membership = await safeFetch(
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

  let appeals = await safeFetch("appeals", [], () => getUserAppeals(userId), dataErrors);
  let unreadAppealsCount = appeals.filter((a) => a.unreadByUser).length;
  const financeFallback = { membershipDebt: null, electricityDebt: null, status: "unknown" as const };
  let cabinetContext = await safeFetch(
    "cabinetContext",
    { hasDebt: false, finance: financeFallback },
    () => getCabinetContext(userId),
    dataErrors,
  );
  let finance = cabinetContext.finance;
  let hasDebt = cabinetContext.hasDebt;
  let electricity = await safeFetch(
    "electricity",
    null,
    () => getUserElectricity(userId, userPlot?.plotId ?? null),
    dataErrors,
  );
  let paymentDetails = await safeFetch(
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
  let events = await safeFetch("userEvents", [], () => getUserEvents(userId, 10), dataErrors);
  let electricityHistory = await safeFetch(
    "electricityHistory",
    [],
    () => getUserElectricityHistory(userId, 6, userPlot?.plotId ?? null),
    dataErrors,
  );
  let financeHistory = await safeFetch(
    "financeHistory",
    [],
    () => getUserFinanceHistory(userId, 6),
    dataErrors,
  );
  let requiredDocs = await safeFetch(
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
  let charges = await safeFetch("charges", [], () => getUserCharges(userId), dataErrors);
  let decisions = await safeFetch("decisions", [], () => getDecisions(), dataErrors);
  let announcements = await safeFetch(
    "announcements",
    [],
    () => listPublishedForAudience(hasDebt),
    dataErrors,
  );
  if (qaMockEnabled) {
    const mock = getQaCabinetMockData();
    userPlots = mock.userPlots;
    ownershipVerifications = mock.ownershipVerifications;
    prefs = mock.prefs;
    membership = mock.membership;
    profile = mock.profile;
    appeals = mock.appeals as typeof appeals;
    cabinetContext = mock.cabinetContext;
    finance = mock.cabinetContext.finance;
    hasDebt = mock.cabinetContext.hasDebt;
    electricity = mock.electricity;
    paymentDetails = mock.paymentDetails;
    events = mock.events;
    electricityHistory = mock.electricityHistory;
    financeHistory = mock.financeHistory;
    requiredDocs = mock.requiredDocs as typeof requiredDocs;
    charges = mock.charges;
    decisions = mock.decisions as typeof decisions;
    announcements = mock.announcements as typeof announcements;
    userPlot = userPlots.find((p) => p.plotId === prefs.activePlotId) || userPlots.find((p) => p.linkStatus === "active") || userPlots[0] || null;
    unreadAppealsCount = appeals.filter((a) => a.unreadByUser).length;
    dataErrors.splice(0, dataErrors.length);
  }
  const decisionMap = new Map(decisions.map((d) => [d.id, d]));
  const userPlotMap = new Map(userPlots.map((p) => [p.plotId, p]));
  const settings = getSntSettings();
  if (dataErrors.length > 0) {
    console.error("[cabinet] data fetch errors", dataErrors);
  }

  const { electricityPaymentDeadlineDay } = settings.value;
  const hasAnyFinanceData = finance.membershipDebt !== null || finance.electricityDebt !== null;
  const hasCharges = charges.length > 0;
  const hasPayables = hasDebt || hasCharges;
  const financeHistoryError = dataErrors.includes("financeHistory");
  const electricityHistoryError = dataErrors.includes("electricityHistory");
  const plotsCount = userPlots.length;
  const verificationsApproved = ownershipVerifications.filter((v) => v.status === "approved").length;
  const verificationsSent = ownershipVerifications.filter((v) => v.status === "sent").length;
  const verificationsRejected = ownershipVerifications.filter((v) => v.status === "rejected").length;
  const { status, latest } = getVerificationStatus(userPlots, ownershipVerifications);
  const latestRejectedNote = latest?.status === "rejected" ? latest.reviewNote : null;
  const hasPlots = userPlots.length > 0;
  const isConfirmed = status === "verified";
  const hasVerifiedPlots = verificationsApproved > 0;
  const isBlocked = membership.status === "non-member" && status === "rejected";
  const contactEmail = PUBLIC_CONTENT_DEFAULTS.contacts.email;
  const contactLinks = [
    OFFICIAL_CHANNELS.telegram ? { label: "Telegram", href: OFFICIAL_CHANNELS.telegram } : null,
    contactEmail ? { label: "Почта", href: `mailto:${contactEmail}` } : null,
    { label: "Контакты", href: "/contacts" },
  ].filter(Boolean) as Array<{ label: string; href: string }>;
  const electricityError =
    typeof sp.electricityError === "string" ? sp.electricityError : null;
  const lastReadingDate =
    electricity?.lastReadingDate && !Number.isNaN(new Date(electricity.lastReadingDate).getTime())
      ? new Date(electricity.lastReadingDate)
      : null;
  const readingPeriodLabel = formatMonthYear(lastReadingDate ?? new Date());
  const announcementsPreview = announcements.slice(0, 3);
  const lastReadingDateLabel = lastReadingDate ? lastReadingDate.toLocaleString("ru-RU") : "—";
  const readingStatusLabel = electricity?.lastReading != null ? "Переданы" : "Не переданы";
  const readingDeadlineText = `до ${electricityPaymentDeadlineDay} числа`;
  const readingPeriodHint = lastReadingDate
    ? `за ${readingPeriodLabel}`
    : "за текущий период";
  const requisitesText = [
    `Получатель: ${paymentDetails.recipientName}`,
    `ИНН/КПП: ${paymentDetails.inn} / ${paymentDetails.kpp}`,
    `Р/с: ${paymentDetails.account}`,
    `Банк: ${paymentDetails.bank}`,
    `БИК: ${paymentDetails.bik}`,
    `Корр. счёт: ${paymentDetails.corrAccount}`,
  ].join("\n");

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
          {unreadAppealsCount > 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm">
              <div className="font-semibold">Ответы по обращениям: {unreadAppealsCount}</div>
              <div className="mt-1 text-amber-800">
                Правление ответило на ваши обращения. Откройте список, чтобы прочитать и отметить прочитанными.
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Link
                  href="/cabinet/appeals"
                  className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-900 shadow-sm ring-1 ring-amber-200 transition hover:ring-amber-400"
                >
                  Открыть обращения
                </Link>
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-800 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Участки и подтверждение
            </div>
            <p className="mt-2 text-sm text-zinc-700">
              Проверьте статус привязки участка или отправьте заявку на подтверждение.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/cabinet/verification"
                className="rounded-full bg-[#5E704F] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#4d5d41]"
              >
                Подтверждение участка
              </Link>
              <Link
                href="/cabinet/link-plot"
                className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-[#5E704F] transition hover:border-[#5E704F]"
              >
                Привязать участок
              </Link>
            </div>
            {hasVerifiedPlots ? (
              <div className="mt-2 text-xs text-zinc-600">
                Подтверждено участков: {verificationsApproved}. Если добавляете новый участок, отправьте заявку.
              </div>
            ) : null}
          </div>

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
                {latest?.status === "draft" ? (
                  <>
                    <div className="mt-2 font-semibold text-zinc-900">
                      🟡 Проверка не отправлена
                    </div>
                    <p className="mt-1 text-sm text-zinc-700">Черновик сохранён.</p>
                  </>
                ) : (
                  <>
                    <div className="mt-2 font-semibold text-zinc-900">
                      🟡 Проверка не начата
                    </div>
                    <p className="mt-1 text-sm text-zinc-700">
                      Добавьте заявку на проверку.
                    </p>
                  </>
                )}
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
                    Написать в правление
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
                <div className="mt-2 font-semibold text-emerald-700">✅ Доступ подтверждён</div>
                <p className="mt-1 text-sm text-emerald-800">
                  Правление подтвердило ваш доступ к данным кабинета.
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

          <RecentAnnouncements
            items={announcementsPreview.map((a) => ({
              id: a.id,
              title: a.title,
              body: a.body,
              isImportant: a.isImportant,
              publishedAt: a.publishedAt,
            }))}
            linkHref="/cabinet/announcements"
            telegramHref={OFFICIAL_CHANNELS.telegram}
            vkHref={OFFICIAL_CHANNELS.vk}
          />

          {isConfirmed ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <Link
                href="/cabinet?section=plots"
                className="cursor-pointer rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-700 shadow-sm transition hover:border-[#5E704F]/40 hover:shadow-md"
              >
                <div className="text-2xl">🏡</div>
                <div className="mt-2 flex items-center justify-between font-semibold text-zinc-900">
                  <span>Мой участок</span>
                  <span className="text-sm text-zinc-400">→</span>
                </div>
                <p className="mt-1 text-xs text-zinc-600">Данные и статус по вашему участку.</p>
              </Link>
              <Link
                href="/cabinet?section=finance"
                className="cursor-pointer rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-700 shadow-sm transition hover:border-[#5E704F]/40 hover:shadow-md"
              >
                <div className="text-2xl">💰</div>
                <div className="mt-2 flex items-center justify-between font-semibold text-zinc-900">
                  <span>Оплаты и взносы</span>
                  <span className="text-sm text-zinc-400">→</span>
                </div>
                <p className="mt-1 text-xs text-zinc-600">Начисления и история платежей.</p>
              </Link>
              <Link
                href="/cabinet?section=electricity"
                className="cursor-pointer rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-700 shadow-sm transition hover:border-[#5E704F]/40 hover:shadow-md"
              >
                <div className="text-2xl">⚡</div>
                <div className="mt-2 flex items-center justify-between font-semibold text-zinc-900">
                  <span>Электроэнергия</span>
                  <span className="text-sm text-zinc-400">→</span>
                </div>
                <p className="mt-1 text-xs text-zinc-600">Показания и начисления.</p>
              </Link>
            </div>
          ) : (
            <div className="text-xs text-zinc-500">
              Разделы кабинета откроются после проверки участка.{" "}
              <Link href="/help" className="text-[#5E704F] underline">
                Подробнее
              </Link>
            </div>
          )}

          {isConfirmed ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 shadow-sm">
              {hasPayables ? (
                <>
                  <div className="font-semibold text-amber-700">Есть начисления к оплате</div>
                  <p className="mt-1 text-xs text-zinc-600">
                    Проверьте начисления и при необходимости оплатите в разделе финансов.
                  </p>
                  <Link
                    href="/cabinet?section=finance"
                    className="mt-3 inline-flex rounded-full bg-[#5E704F] px-4 py-2 text-xs font-semibold text-white"
                  >
                    Открыть Финансы
                  </Link>
                </>
              ) : !hasAnyFinanceData && !hasCharges ? (
                <>
                  <div className="font-semibold text-zinc-800">Данные обновляются</div>
                  <p className="mt-1 text-xs text-zinc-600">
                    Пока нет начислений или данные ещё не подтянулись.
                  </p>
                </>
              ) : (
                <>
                  <div className="font-semibold text-emerald-700">Задолженности нет</div>
                  <p className="mt-1 text-xs text-zinc-600">
                    Если появятся начисления или уведомления — мы покажем их здесь.
                  </p>
                </>
              )}
            </div>
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
          <div>{readingStatusLabel}</div>
          <div className="text-xs text-zinc-600">Период: за {readingPeriodLabel}</div>
          <div className="text-xs text-zinc-600">Последняя отправка: {lastReadingDateLabel}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
          <div className="font-semibold text-zinc-900">Долг</div>
          <div>{electricity?.debt == null ? "Нет данных" : `${electricity.debt} ₽`}</div>
        </div>
      </div>
      <form action={submitElectricity} className="mt-3 flex flex-col gap-2 text-sm">
        <label className="text-zinc-800">
          Передать показания
          <div className="mt-1 text-xs text-zinc-500">
            Приём показаний {readingDeadlineText}, {readingPeriodHint}.
          </div>
          <input
            type="text"
            name="reading"
            inputMode="numeric"
            pattern="[0-9]+"
            placeholder="Например: 012345"
            required
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          />
          <div className="mt-1 text-xs text-zinc-500">Только цифры, как на счётчике.</div>
          {electricityError === "reading" ? (
            <div className="mt-1 text-xs text-rose-600">
              Проверьте показания: нужны только цифры, без пробелов и знаков.
            </div>
          ) : null}
        </label>
        <SubmitElectricityButton />
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
        <Link
          href="/cabinet?section=docs#requisites"
          className="inline-flex text-xs font-semibold text-[#5E704F] underline"
        >
          Реквизиты
        </Link>
        <PaymentPurposeClient
          street={userPlot?.street ?? null}
          plotNumber={userPlot?.plotNumber ?? null}
          lastReading={electricity?.lastReading ?? null}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-800">
          <div className="font-semibold text-zinc-900">Электроэнергия (последние 6 мес.)</div>
          {electricityHistoryError ? (
            <div className="mt-2 space-y-2 text-xs text-zinc-600">
              <div>Ошибка загрузки, попробуйте обновить.</div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/cabinet?section=finance"
                  className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-[#5E704F] hover:text-[#5E704F]"
                >
                  Перейти в Финансы
                </Link>
                <Link
                  href="/contacts"
                  className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-[#5E704F] hover:text-[#5E704F]"
                >
                  Контакты
                </Link>
              </div>
            </div>
          ) : !hasAnyFinanceData && electricityHistory.length === 0 ? (
            <div className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-4 text-center text-sm text-zinc-600">
              Данные загружаются
            </div>
          ) : electricityHistory.length === 0 ? (
            <div className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-4 text-center text-sm text-zinc-600">
              Начислений пока нет
            </div>
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
          {financeHistoryError ? (
            <div className="mt-2 space-y-2 text-xs text-zinc-600">
              <div>Не удалось загрузить платежи.</div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/cabinet?section=finance"
                  className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-[#5E704F] hover:text-[#5E704F]"
                >
                  Перейти в Финансы
                </Link>
                <Link
                  href="/contacts"
                  className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-[#5E704F] hover:text-[#5E704F]"
                >
                  Контакты
                </Link>
              </div>
            </div>
          ) : !hasAnyFinanceData && financeHistory.length === 0 ? (
            <div className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-4 text-center text-sm text-zinc-600">
              Данные загружаются
            </div>
          ) : financeHistory.length === 0 ? (
            <div className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-4 text-center text-sm text-zinc-600">
              Платежей пока нет
            </div>
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
      <p className="text-xs text-zinc-500">Начисления — суммы к оплате за период.</p>
      {charges.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600">
          Начислений пока нет
        </div>
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
          <div className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600">
            Нет обязательных документов
          </div>
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
                      <AckDocButton />
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div
        id="requisites"
        className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Реквизиты СНТ</h3>
            <p className="text-xs text-zinc-700">Для оплаты взносов и электроэнергии.</p>
          </div>
          <CopyToClipboard text={requisitesText} label="📋 Копировать" />
        </div>
        <div className="mt-3 space-y-1 text-xs text-zinc-700">
          <div>Получатель: {paymentDetails.recipientName}</div>
          <div>ИНН/КПП: {paymentDetails.inn} / {paymentDetails.kpp}</div>
          <div>Р/с: {paymentDetails.account}</div>
          <div>Банк: {paymentDetails.bank}</div>
          <div>БИК: {paymentDetails.bik}</div>
          <div>Корр. счёт: {paymentDetails.corrAccount}</div>
        </div>
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
            <MarkAllEventsButton />
          </form>
        )}
      </div>
      <p className="text-xs text-zinc-600">
        Здесь появятся уведомления от правления и статусы ваших обращений.
      </p>
      {events.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600">
          Пока нет новых уведомлений
        </div>
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
                    <MarkEventButton />
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
        {qaEnabled() ? (
          <Link href="/admin/appeals" className="text-xs font-semibold text-[#5E704F] underline">
            Админка обращений
          </Link>
        ) : (
          <span className="text-xs text-zinc-500" title="Доступно только при ENABLE_QA=true">
            Админка обращений (недоступно)
          </span>
        )}
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
        <SubmitAppealButton />
      </form>
      <div className="space-y-2 text-sm text-zinc-800">
        <div className="text-sm font-semibold text-zinc-900">Мои обращения</div>
        {appeals.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600">
            Обращений нет — вы можете написать новое
          </div>
        ) : (
          <ul className="space-y-2">
            {appeals.map((a) => (
              <li key={a.id} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                <div className="flex items-center justify-between text-xs text-zinc-600">
                  <span>Создано: {new Date(a.createdAt).toLocaleString("ru-RU")}</span>
                  <span>
                    {a.status === "new"
                      ? "Принято"
                      : a.status === "in_progress"
                        ? "В работе"
                        : a.status === "answered"
                          ? "Отвечено"
                          : a.status === "closed"
                            ? "Закрыто"
                            : "Черновик"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-800">{(a as { message?: string }).message ?? ""}</p>
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
        {user.role !== "user" && (
          <div className="rounded-xl border border-zinc-200 bg-white px-3 py-3">
            <div className="text-xs text-zinc-500">Заявки</div>
            <div className="mt-1 text-sm text-zinc-800">
              Подтверждено: {verificationsApproved}
            </div>
            <div className="text-sm text-zinc-800">На проверке: {verificationsSent}</div>
            <div className="text-sm text-zinc-800">Отклонено: {verificationsRejected}</div>
          </div>
        )}
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
          { key: "charges" as SectionKey, title: "Начисления", desc: "Суммы к оплате за период", targetId: "charges-section" },
          { key: "appeals" as SectionKey, title: "Написать обращение", desc: "Вопросы правлению", targetId: "appeals-section" },
          { key: "docs" as SectionKey, title: "Документы", desc: "Устав и протоколы", targetId: "docs-section" },
        ]
      : [];

  const qaSectionMap: Partial<Record<QaCabinetStage, SectionKey>> = {
    cabinet_home: "home",
    cabinet_payments: "finance",
    cabinet_power: "electricity",
    cabinet_appeals: "appeals",
    cabinet_docs: "docs",
    cabinet_help: "docs",
  };

  const initialSection = (() => {
    const param = typeof sp.section === "string" ? sp.section : "home";
    const allowed: SectionKey[] = sections.map((s) => s.key);
    const qaSection = qaStage ? qaSectionMap[qaStage] : null;
    if (qaSection && allowed.includes(qaSection)) {
      return qaSection;
    }
    return allowed.includes(param as SectionKey) ? (param as SectionKey) : "home";
  })();

  const cabinetRole: "user" | "admin" | "board" | "chair" | null = 
    user.role === "admin" ? "admin" :
    user.role === "board" ? "board" :
    user.role === "chairman" ? "chair" :
    user.role === "user" || user.role === "resident" ? "user" :
    null;
  const qaStageActive = isDevEnv ? qaStage : null;

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-4 sm:px-6" data-testid="cabinet-page-root">
      <CabinetHeader
        title={headerInfo.title}
        statusLine={headerInfo.statusLine}
        progressLabel={headerInfo.progressLabel}
        progressHref={headerInfo.progressHref}
      />
      {normalizedRole === "admin" ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900">
          Вы администратор — режим теста
        </div>
      ) : null}
      {isDevEnv ? <CabinetDevPanel currentStage={qaStageActive} /> : null}
      <CabinetShell
        sections={sections}
        quickActions={quickActions}
        initialActive={initialSection}
        isImpersonating={Boolean(user.isImpersonating)}
        role={cabinetRole}
        userName={profile.fullName ?? null}
        plotsCount={plotsCount}
      />
    </div>
  );
}

export default function CabinetPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <CabinetStageRenderer searchParams={searchParams} />;
}
