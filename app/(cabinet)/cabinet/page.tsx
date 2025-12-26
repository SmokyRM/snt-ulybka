import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { getUserPlots } from "@/lib/plots";
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
import { getUserProfile, upsertUserProfileByAdmin, upsertUserProfileByUser } from "@/lib/userProfiles";
import { getUserPreferences, setActivePlot } from "@/lib/userPreferences";
import { CabinetShell, type SectionKey } from "./CabinetShell";
import { PaymentPurposeClient } from "./PaymentPurposeClient";
import { ProfileCard } from "./ProfileCard";

async function submitAppeal(formData: FormData) {
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
  const comment = (formData.get("comment") as string | null) ?? "";
  const proofType = (formData.get("proofType") as string | null) ?? "other";
  const plots = [1, 2, 3]
    .map((idx) => {
      const num = (formData.get(`plotNumber${idx}`) as string | null) ?? "";
      const st = (formData.get(`plotStreet${idx}`) as string | null) ?? "";
      const cad = (formData.get(`plotCadastral${idx}`) as string | null) ?? "";
      return { plotNumber: num.trim(), street: st.trim() || null, cadastral: cad.trim() || null };
    })
    .filter((p) => p.plotNumber);
  const profile = await getUserProfile(user.id ?? "");
  if (!profile.fullName || !profile.phone) {
    redirect("/cabinet#profile");
  }
  await submitMembershipRequest({
    userId: user.id ?? "",
    fullName: profile.fullName ?? "",
    phone: profile.phone ?? "",
    plots,
    comment,
    proofType: proofType as "extract_egrn" | "sale_contract" | "garden_book" | "other",
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

async function simulateFirstEntry() {
  "use server";
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "board")) {
    redirect("/login");
  }
  await upsertUserProfileByAdmin(user.id ?? "", { fullName: "", phone: "", cadastralNumbers: [] });
  redirect("/cabinet?section=home");
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
  const prefs = await getUserPreferences(user.id ?? "");
  const userPlot = userPlots.find((p) => p.plotId === prefs.activePlotId) || userPlots.find((p) => p.status === "active") || userPlots[0] || null;
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
  const hasMembershipDebt = finance.membershipDebt != null && finance.membershipDebt > 0;
  const hasElectricityDebt = finance.electricityDebt != null && finance.electricityDebt > 0;
  const hasAnyFinanceData = finance.membershipDebt !== null || finance.electricityDebt !== null;
  const needsAttention =
    membership.status === "unknown" ||
    userPlot?.plotNumber == null ||
    userPlot?.street == null ||
    finance.status === "unknown" ||
    (electricity?.lastReading == null && electricity?.debt == null);

  const unpaidChargesSum = charges
    .filter((c) => c.status === "unpaid")
    .reduce((sum, c) => sum + c.amount, 0);

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

      {process.env.NODE_ENV !== "production" && user.role === "admin" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-emerald-900">Тесты (admin only)</div>
            <form action={simulateFirstEntry}>
              <button
                type="submit"
                className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-semibold text-emerald-800 hover:border-emerald-400"
              >
                Симулировать первый вход
              </button>
            </form>
          </div>
          <p className="mt-1 text-xs text-emerald-700">Очищает профиль (ФИО/телефон) текущего пользователя.</p>
        </div>
      )}

      <div className="rounded-2xl border border-[#5E704F]/20 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Мои участки</h2>
        <div className="mt-3 grid gap-3 text-sm text-zinc-800 sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <div className="font-semibold text-zinc-900">Мои участки</div>
            {userPlots.length === 0 ? (
              <div>Участки не привязаны</div>
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

        {membership.status !== "member" && (
          <div className="mt-4 space-y-2 rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-800 shadow-sm">
            <div className="font-semibold text-zinc-900">Подтвердить членство</div>
            <p className="text-xs text-zinc-600">Документ потребуется показать правлению для подтверждения.</p>
            {profileMissing ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                Сначала заполните профиль (ФИО и телефон), затем отправьте заявку.
              </div>
            ) : profile.fullName && profile.phone ? (
              <form action={submitMembership} className="grid gap-2 text-sm">
                <div className="rounded border border-zinc-200 bg-white p-3">
                  <div className="mb-2 text-xs font-semibold text-zinc-700">Участки</div>
                  <div className="mb-2 grid gap-2 sm:grid-cols-2">
                    <input name="plotStreet1" placeholder="Улица (обязательно)" className="w-full rounded border border-zinc-300 px-3 py-2" />
                    <input name="plotNumber1" placeholder="Участок (обязательно)" className="w-full rounded border border-zinc-300 px-3 py-2" required />
                    <input name="plotCadastral1" placeholder="Кадастровый номер (опц.)" className="w-full rounded border border-zinc-300 px-3 py-2 sm:col-span-2" />
                  </div>
                  <details className="mb-2 rounded border border-dashed border-zinc-300 bg-zinc-50 p-2 text-xs text-zinc-700">
                    <summary className="cursor-pointer text-zinc-800">+ Добавить ещё участок</summary>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <input name="plotStreet2" placeholder="Улица (опц.)" className="w-full rounded border border-zinc-300 px-3 py-2" />
                      <input name="plotNumber2" placeholder="Участок (опц.)" className="w-full rounded border border-zinc-300 px-3 py-2" />
                      <input name="plotCadastral2" placeholder="Кадастровый номер (опц.)" className="w-full rounded border border-zinc-300 px-3 py-2 sm:col-span-2" />
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <input name="plotStreet3" placeholder="Улица (опц.)" className="w-full rounded border border-zinc-300 px-3 py-2" />
                      <input name="plotNumber3" placeholder="Участок (опц.)" className="w-full rounded border border-zinc-300 px-3 py-2" />
                      <input name="plotCadastral3" placeholder="Кадастровый номер (опц.)" className="w-full rounded border border-zinc-300 px-3 py-2 sm:col-span-2" />
                    </div>
                  </details>
                </div>
                <label className="text-xs text-zinc-700">
                  Тип документа
                  <select
                    name="proofType"
                    className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                    defaultValue="extract_egrn"
                  >
                    <option value="extract_egrn">Выписка ЕГРН</option>
                    <option value="sale_contract">Договор купли-продажи</option>
                    <option value="garden_book">Садовая книжка</option>
                    <option value="other">Другое</option>
                  </select>
                </label>
                <textarea
                  name="comment"
                  rows={2}
                  placeholder="Комментарий (опционально)"
                  className="w-full rounded border border-zinc-300 px-3 py-2"
                />
                <button
                  type="submit"
                  className="self-start rounded-full bg-[#5E704F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4d5d41]"
                >
                  Отправить заявку
                </button>
              </form>
            ) : (
              <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <div>Чтобы отправить заявку, заполните профиль (ФИО и телефон).</div>
                <a
                  href="#profile"
                  className="inline-flex items-center justify-center rounded-full border border-amber-300 px-3 py-2 font-semibold text-amber-800 hover:border-amber-400"
                >
                  Заполнить профиль
                </a>
              </div>
            )}
          </div>
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

  const initialSection = (() => {
    const param = typeof searchParams?.section === "string" ? searchParams?.section : "home";
    const allowed: SectionKey[] = ["home", "electricity", "finance", "charges", "appeals", "docs", "events"];
    return allowed.includes(param as SectionKey) ? (param as SectionKey) : "home";
  })();

  const sections: { key: SectionKey; title: string; content: React.ReactNode }[] = [
    { key: "home", title: "Домой (ЛК)", content: homeSection },
    { key: "electricity", title: "Электроэнергия", content: electricitySection },
    { key: "finance", title: "Финансы", content: financeSection },
    { key: "charges", title: "Начисления", content: chargesSection },
    { key: "appeals", title: "Обращения", content: appealsSection },
    { key: "docs", title: "Документы", content: docsSection },
    { key: "events", title: "Уведомления", content: eventsSection },
  ];

  const quickActions = [
    { key: "electricity" as SectionKey, title: "Передать показания", desc: "Электроэнергия", targetId: "electricity-section" },
    { key: "charges" as SectionKey, title: "Начисления", desc: "Основания и суммы", targetId: "charges-section" },
    { key: "appeals" as SectionKey, title: "Написать обращение", desc: "Вопросы правлению", targetId: "appeals-section" },
    { key: "docs" as SectionKey, title: "Документы", desc: "Устав и протоколы", targetId: "docs-section" },
  ];

  return <CabinetShell sections={sections} unreadCount={unreadCount} quickActions={quickActions} initialActive={initialSection} />;
}
