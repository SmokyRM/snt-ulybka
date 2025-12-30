import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
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
import { ProfileCard } from "./ProfileCard";
import { MembershipBlock } from "./MembershipBlock";
import { AIHelper } from "./AIHelper";
import PlotAccessBlock from "./PlotAccessBlock";
import EmptyState from "@/components/EmptyState";

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

  const userPlots = await getUserPlots(user.id ?? "");
  const ownershipVerifications = await getUserOwnershipVerifications(user.id ?? "");
  const prefs = await getUserPreferences(user.id ?? "");
  const userPlot = userPlots.find((p) => p.plotId === prefs.activePlotId) || userPlots.find((p) => p.linkStatus === "active") || userPlots[0] || null;
  const membership = await getMembershipStatus(user.id ?? "");
  let profile = await getUserProfile(user.id ?? "");
  const latestRequest = await getLatestMembershipRequestForUser(user.id ?? "");
  const activeRequestHasContacts =
    latestRequest?.status === "new" && !!latestRequest.fullName && !!latestRequest.phone;
  if (
    (!profile.fullName || !profile.phone) &&
    activeRequestHasContacts
  ) {
    await upsertUserProfileByUser(user.id ?? "", { fullName: latestRequest.fullName, phone: latestRequest.phone });
    profile = await getUserProfile(user.id ?? "");
  }
  const profileMissing = !profile.fullName || !profile.phone;
  if (profileMissing && user.role !== "admin") {
    redirect("/onboarding");
  }
  const membershipStatusText =
    membership.status === "member"
      ? "Член"
      : membership.status === "non-member"
        ? "Не член"
        : membership.status === "pending"
          ? "На проверке"
          : "Данные уточняются";
  const isProfileComplete = !profileMissing;
  const isMembershipApproved = membership.status === "member";

  const appeals = await getUserAppeals(user.id ?? "");
  const finance = await getUserFinanceInfo(user.id ?? "");
  const electricity = await getUserElectricity(user.id ?? "", userPlot?.plotId ?? null);
  const paymentDetails = await getPaymentDetails();
  const events = await getUserEvents(user.id ?? "", 10);
  const unreadCount = await getUnreadCount(user.id ?? "");
  const electricityHistory = await getUserElectricityHistory(user.id ?? "", 6, userPlot?.plotId ?? null);
  const financeHistory = await getUserFinanceHistory(user.id ?? "", 6);
  const requiredDocs = await getRequiredDocsForUser({
    userId: user.id ?? "",
    membershipStatus:
      membership.status === "member"
        ? "member"
        : membership.status === "non-member"
          ? "non-member"
          : "unknown",
  });
  const charges = await getUserCharges(user.id ?? "");
  const decisions = await getDecisions();
  const decisionMap = new Map(decisions.map((d) => [d.id, d]));
  const userPlotMap = new Map(userPlots.map((p) => [p.plotId, p]));

  const appealsInProgress = appeals.filter((a) => a.status === "in_progress").length;
  const lastAppeal = appeals[0];
  const delegateCode = typeof searchParams?.delegateCode === "string" ? searchParams.delegateCode : null;
  const delegateError = typeof searchParams?.delegateError === "string" ? searchParams.delegateError : null;
  const codeRequestSent = typeof searchParams?.codeRequest === "string";
  const hasMembershipDebt = finance.membershipDebt != null && finance.membershipDebt > 0;
  const hasElectricityDebt = finance.electricityDebt != null && finance.electricityDebt > 0;
  const hasAnyFinanceData = finance.membershipDebt !== null || finance.electricityDebt !== null;
  const needsAttention =
    membership.status === "unknown" ||
    userPlot?.plotNumber == null ||
    userPlot?.street == null ||
    finance.status === "unknown" ||
    (electricity?.lastReading == null && electricity?.debt == null);
  const locked = typeof searchParams?.locked === "string";

  const unpaidChargesSum = charges
    .filter((c) => c.status === "unpaid")
    .reduce((sum, c) => sum + c.amount, 0);
  const plotsCount = userPlots.length;
  const verificationsApproved = ownershipVerifications.filter((v) => v.status === "approved").length;
  const verificationsSent = ownershipVerifications.filter((v) => v.status === "sent").length;
  const verificationsRejected = ownershipVerifications.filter((v) => v.status === "rejected").length;
  const plotsCta =
    plotsCount === 0 && verificationsSent === 0
      ? { label: "Подтвердить участок", href: "/cabinet/plots/new" }
      : verificationsSent > 0
        ? { label: "Посмотреть заявку", href: "/cabinet/plots" }
        : { label: "Открыть мои участки", href: "/cabinet/plots" };
  const aiContext = {
    membershipStatus: membership.status,
    plotsCount,
    hasVerifiedPlot: userPlots.some((p) => p.ownershipStatus === "verified"),
    verificationsSent,
    verificationsRejected,
    membershipDebt: finance.membershipDebt,
    electricityDebt: finance.electricityDebt,
  };

  const homeSection = (
    <div className="space-y-4">
      {(needsAttention || profileMissing) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              {profileMissing
                ? "Заполните профиль (ФИО и телефон), чтобы продолжить работу кабинета."
                : "Данные уточняются. Если вы недавно купили участок или сменились данные — отправьте обращение."}
            </div>
            <span className="rounded-full border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-800">
              Обновление данных
            </span>
          </div>
        </div>
      )}
      {!isMembershipApproved && isProfileComplete && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 shadow-sm">
          Разделы кабинета откроются после подтверждения членства.
          {locked ? " Запросите подтверждение на этой странице." : null}
        </div>
      )}

      <div className="rounded-2xl border border-[#5E704F]/20 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Мои участки</h2>
        <div className="mt-3 grid gap-3 text-sm text-zinc-800 sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <div className="font-semibold text-zinc-900">Мои участки</div>
            {userPlots.length === 0 ? (
              <EmptyState
                title="Участок не привязан"
                description="Введите код привязки или запросите его в правлении."
              />
            ) : (
              <ul className="mt-1 space-y-2">
                {userPlots.map((p) => {
                  const isActive = userPlot?.plotId === p.plotId;
                  return (
                    <li key={p.plotId} className="space-y-0.5 rounded-lg border border-zinc-200 bg-white px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span>
                          № {p.plotNumber}, {p.street}
                        </span>
                        {isActive ? (
                          <span className="rounded-full border border-emerald-300 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                            Активный
                          </span>
                        ) : (
                          <form action={setActivePlotAction}>
                            <input type="hidden" name="plotId" value={p.plotId} />
                            <button
                              type="submit"
                              className="rounded-full border border-zinc-300 px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:border-zinc-400"
                            >
                              Сделать активным
                            </button>
                          </form>
                        )}
                      </div>
                      <div className="text-xs text-zinc-600">{p.ownershipStatus === "verified" ? "подтверждён" : "на проверке"}</div>
                      {p.cadastral ? <div className="text-xs text-zinc-600">Кадастровый номер: {p.cadastral}</div> : null}
                      {!isActive ? (
                        <div className="pt-1 text-[11px] text-zinc-600">
                          Чтобы изменить данные участка, создайте обращение с темой &laquo;Изменение данных участка&raquo;.
                          <a className="ml-1 text-[#5E704F] underline" href="/cabinet?section=appeals#appeals-section">
                            Написать обращение
                          </a>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
        <div className="mt-2 text-sm text-zinc-800">Статус: {membershipStatusText}</div>
      </div>

      <AIHelper context={aiContext} />
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <div className="font-semibold text-zinc-900">Электроэнергия</div>
            <div>{electricity?.lastReading != null ? "Показания переданы" : "Не переданы"}</div>
            <div className="text-xs text-zinc-600">
              Дата: {electricity?.lastReadingDate ? new Date(electricity.lastReadingDate).toLocaleString("ru-RU") : "—"}
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <div className="font-semibold text-zinc-900">Долги</div>
            <div>
              Членские: {hasMembershipDebt ? `${finance.membershipDebt} ₽` : "Нет долга"}
            </div>
            <div>
              Электро: {hasElectricityDebt ? `${finance.electricityDebt} ₽` : "Нет долга"}
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <div className="font-semibold text-zinc-900">Обращения</div>
            <div>В работе: {appealsInProgress}</div>
            <div className="text-xs text-zinc-600">
              Последнее: {lastAppeal ? new Date(lastAppeal.createdAt).toLocaleString("ru-RU") : "—"}
            </div>
          </div>
        </div>

        <ProfileCard profile={profile} action={updateProfile} autoEdit={profileMissing} />

        {userPlot && userPlot.ownerUserId === user.id ? (
          <div className="mt-4 space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-800 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-zinc-900">Представитель (только один)</div>
                <p className="text-xs text-zinc-600">Код действует 7 дней. Сменить представителя можно в любой момент.</p>
              </div>
              {delegateCode ? (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                  Код приглашения: {delegateCode}
                </span>
              ) : null}
            </div>
            {delegateError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                Ошибка: {delegateError}
              </div>
            ) : null}
            {userPlot.delegateUserId ? (
              <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <div className="text-sm text-zinc-800">
                  Представитель: {userPlot.delegateUserId}
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={clearDelegateAction}>
                    <input type="hidden" name="plotId" value={userPlot.plotId} />
                    <button
                      type="submit"
                      className="rounded-full border border-red-200 px-3 py-1 text-[11px] font-semibold text-red-700 hover:border-red-300"
                    >
                      Удалить представителя
                    </button>
                  </form>
                  <form action={createDelegateInviteAction}>
                    <input type="hidden" name="plotId" value={userPlot.plotId} />
                    <input type="hidden" name="allowReplace" value="1" />
                    <button
                      type="submit"
                      className="rounded-full border border-[#5E704F] px-3 py-1 text-[11px] font-semibold text-[#5E704F] hover:bg-[#5E704F]/10"
                    >
                      Сменить представителя (новый код)
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <form action={createDelegateInviteAction} className="flex flex-col gap-2 sm:flex-row">
                <input type="hidden" name="plotId" value={userPlot.plotId} />
                <input
                  name="invitePhone"
                  placeholder="Телефон представителя"
                  className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-full bg-[#5E704F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4d5d41]"
                >
                  Пригласить
                </button>
              </form>
            )}
            <p className="text-xs text-zinc-600">
              Код показывается один раз. В проде передайте его представителю лично.
            </p>
          </div>
        ) : null}

        <PlotAccessBlock
          hasPlots={userPlots.length > 0}
          codeRequestSent={codeRequestSent}
          onSubmitCode={acceptDelegateInviteAction}
          onRequestCode={submitCodeRequest}
        />

        {userPlot ? (
          <div className="mt-4 space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-800 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-zinc-900">Сверка данных участка</div>
                <p className="text-xs text-zinc-600">Проверьте информацию реестра и при необходимости предложите исправления.</p>
              </div>
              {userPlot.proposedChanges ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-800">
                  Изменения отправлены в правление
                </span>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <div className="text-xs font-semibold text-zinc-700">В реестре</div>
                <div className="mt-1 text-sm text-zinc-800">Улица: {userPlot.street}</div>
                <div className="text-sm text-zinc-800">Участок: {userPlot.plotNumber}</div>
                <div className="text-sm text-zinc-800">Кадастровый: {userPlot.cadastral || "—"}</div>
                <div className="text-xs text-zinc-600">Статус: {userPlot.status || "DRAFT"}</div>
              </div>
              <form action={submitPlotProposalAction} className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <input type="hidden" name="plotId" value={userPlot.plotId} />
                <div className="text-xs font-semibold text-zinc-700">Ваши данные</div>
                <input
                  name="proposalStreet"
                  defaultValue={userPlot.proposedChanges?.street ?? userPlot.street}
                  className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                  placeholder="Улица"
                />
                <input
                  name="proposalPlotNumber"
                  defaultValue={userPlot.proposedChanges?.plotNumber ?? userPlot.plotNumber}
                  className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                  placeholder="Участок"
                />
                <input
                  name="proposalCadastral"
                  defaultValue={userPlot.proposedChanges?.cadastral ?? userPlot.cadastral ?? ""}
                  className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                  placeholder="Кадастровый номер"
                />
                <button
                  type="submit"
                  className="inline-flex items-center rounded-full bg-[#5E704F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4d5d41]"
                >
                  Отправить изменения
                </button>
              </form>
            </div>
          </div>
        ) : null}

        {profileMissing ? null : (
          <MembershipBlock
            latestRequest={latestRequest ? { ...latestRequest, plotId: userPlot?.plotId } : null}
            onSubmit={submitMembership}
            onProposal={submitPlotProposalAction}
          />
        )}
      </div>

      {membership.status === "member" ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-zinc-900">Статистика СНТ</h3>
          <div className="mt-2 grid gap-2 text-sm text-zinc-700 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
              Показания электро: {electricity?.lastReading != null ? "переданы" : "нет данных"}
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
              Обращений в работе: {appealsInProgress}
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
              Неоплаченных начислений: {charges.filter((c) => c.status === "unpaid").length}
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
              Сумма неоплаченных: {unpaidChargesSum || "нет данных"}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 shadow-sm">
          Статистика СНТ доступна после подтверждения членства.
        </div>
      )}
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
          {verificationsSent > 0 && (
            <div className="mt-1 text-xs text-zinc-500">На проверке — обычно 1–3 дня.</div>
          )}
          {verificationsSent === 0 && verificationsRejected > 0 && (
            <div className="mt-1 text-xs text-zinc-500">Отклонено — проверь причину.</div>
          )}
        </div>
      </div>
      <Link
        href={plotsCta.href}
        className="inline-flex items-center rounded-full bg-[#5E704F] px-4 py-2 text-xs font-semibold text-white"
      >
        {plotsCta.label}
      </Link>
    </div>
  );

  const sections: { key: SectionKey; title: string; content: React.ReactNode }[] = [
    { key: "home", title: "Домой (ЛК)", content: homeSection },
  ];
  sections.push({ key: "plots", title: "Мои участки", content: plotsSection });
  if (isProfileComplete && isMembershipApproved) {
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
    isProfileComplete && isMembershipApproved
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
