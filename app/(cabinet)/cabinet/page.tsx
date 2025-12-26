import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { getUserPlotInfo } from "@/lib/getUserPlotInfo";
import { createAppeal, getUserAppeals } from "@/lib/appeals";
import { getUserFinanceInfo } from "@/lib/getUserFinanceInfo";
import { getUserElectricity, getUserElectricityHistory, submitReading } from "@/lib/electricity";
import { getUnreadCount, getUserEvents, markAllRead, markEventRead } from "@/lib/userEvents";
import { getPaymentDetails } from "@/lib/paymentDetails";
import { getUserFinanceHistory } from "@/lib/financeHistory";
import { getUserCharges } from "@/lib/charges";
import { acknowledgeDoc, getRequiredDocsForUser } from "@/lib/requiredDocs";
import { getDecisions } from "@/lib/decisions";
import { CabinetShell, type SectionKey } from "./CabinetShell";
import { PaymentPurposeClient } from "./PaymentPurposeClient";

async function submitAppeal(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "user" && user.role !== "board")) {
    redirect("/login");
  }
  if (user.role === "admin") {
    const store = await Promise.resolve(cookies());
    const view = store.get("admin_view")?.value || "admin";
    if (view !== "user") {
      redirect("/admin");
    }
  }
  const text = (formData.get("appeal") as string | null) ?? "";
  await createAppeal(user.id ?? "", text);
  redirect("/cabinet");
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
    if (view !== "user") {
      redirect("/admin");
    }
  }
  const value = Number(formData.get("reading"));
  if (!Number.isFinite(value) || value < 0) {
    redirect("/cabinet");
  }
  await submitReading(user.id ?? "", value);
  redirect("/cabinet");
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
    if (view !== "user") {
      redirect("/admin");
    }
  }
  const id = formData.get("eventId") as string | null;
  if (!id) redirect("/cabinet");
  await markEventRead(user.id ?? "", id);
  redirect("/cabinet");
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
    if (view !== "user") {
      redirect("/admin");
    }
  }
  await markAllRead(user.id ?? "");
  redirect("/cabinet");
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
    if (view !== "user") {
      redirect("/admin");
    }
  }
  const docId = formData.get("docId") as string | null;
  if (!docId) redirect("/cabinet");
  await acknowledgeDoc(user.id ?? "", docId);
  redirect("/cabinet");
}

export default async function CabinetPage() {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "user" && user.role !== "board")) {
    redirect("/login");
  }

  if (user.role === "admin") {
    const store = await Promise.resolve(cookies());
    const view = store.get("admin_view")?.value || "admin";
    if (view !== "user") {
      redirect("/admin");
    }
  }

  const plotInfo = await getUserPlotInfo(user.id ?? "");
  const plotNumber = plotInfo.plotNumber ?? "—";
  const street = plotInfo.street ?? "—";
  const membershipStatus =
    plotInfo.membershipStatus === "member"
      ? "Член"
      : plotInfo.membershipStatus === "non-member"
        ? "Не член"
        : "Данные уточняются";
  const appeals = await getUserAppeals(user.id ?? "");
  const finance = await getUserFinanceInfo(user.id ?? "");
  const electricity = await getUserElectricity(user.id ?? "");
  const paymentDetails = await getPaymentDetails();
  const events = await getUserEvents(user.id ?? "", 10);
  const unreadCount = await getUnreadCount(user.id ?? "");
  const electricityHistory = await getUserElectricityHistory(user.id ?? "", 6);
  const financeHistory = await getUserFinanceHistory(user.id ?? "", 6);
  const requiredDocs = await getRequiredDocsForUser({
    userId: user.id ?? "",
    membershipStatus: plotInfo.membershipStatus === "member" ? "member" : plotInfo.membershipStatus === "non-member" ? "non-member" : "unknown",
  });
  const charges = await getUserCharges(user.id ?? "");
  const decisions = await getDecisions();
  const decisionMap = new Map(decisions.map((d) => [d.id, d]));
  const appealsInProgress = appeals.filter((a) => a.status === "in_progress").length;
  const lastAppeal = appeals[0];
  const hasMembershipDebt = finance.membershipDebt != null && finance.membershipDebt > 0;
  const hasElectricityDebt = finance.electricityDebt != null && finance.electricityDebt > 0;
  const hasTargetDebt = false;
  const hasAnyFinanceData =
    finance.membershipDebt !== null || finance.electricityDebt !== null || hasTargetDebt;
  const needsAttention =
    plotInfo.membershipStatus === "unknown" ||
    plotInfo.plotNumber === null ||
    plotInfo.street === null ||
    finance.status === "unknown" ||
    (electricity?.lastReading == null && electricity?.debt == null);

  const homeSection = (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Быстрые действия</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          {[
            { key: "electricity" as SectionKey, title: "Передать показания", desc: "Электроэнергия" },
            { key: "appeals" as SectionKey, title: "Написать обращение", desc: "Вопросы правлению" },
            { key: "charges" as SectionKey, title: "Начисления", desc: "Основания и суммы" },
            { key: "docs" as SectionKey, title: "Документы", desc: "Устав и протоколы" },
          ].map((card) => (
            <button
              key={card.key}
              type="button"
              onClick={() => {
                const target = card.key;
                const el = document?.getElementById(`${target}-section`);
                setTimeout(() => el?.scrollIntoView({ behavior: "smooth" }), 50);
                // @ts-ignore setActive from shell scope
              }}
              className="flex flex-col rounded-xl border border-[#5E704F]/30 bg-[#5E704F]/5 px-3 py-3 text-left text-sm font-semibold text-[#2F3827] transition-colors hover:border-[#5E704F]/60"
            >
              <span>{card.title}</span>
              <span className="text-xs font-normal text-zinc-700">{card.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {needsAttention && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              Данные уточняются. Если вы недавно купили участок или сменились данные — отправьте обращение.
            </div>
            <a
              href="#appeals"
              className="rounded-full border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100"
            >
              Написать обращение
            </a>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-[#5E704F]/20 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Мой участок</h2>
        <div className="mt-3 grid gap-3 text-sm text-zinc-800 sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <div className="font-semibold text-zinc-900">Участок</div>
            <div>№ {plotNumber}, {street}</div>
            <div>Статус: {membershipStatus}</div>
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
      </div>

      {plotInfo.membershipStatus === "member" ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-zinc-900">Статистика СНТ</h3>
          <div className="mt-2 grid gap-2 text-sm text-zinc-700 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
              Показания электро: данных нет (MVP)
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
              Обращений в работе: {appealsInProgress}
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
              Сумма долгов: нет данных (MVP)
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
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <a
            href="#appeals"
            className="rounded-full border border-[#5E704F] px-4 py-2 text-xs font-semibold text-[#5E704F] transition-colors hover:bg-[#5E704F]/10"
          >
            Задать вопрос
          </a>
        </div>
        <h2 className="mt-3 text-lg font-semibold text-zinc-900">Финансы</h2>
        <div className="mt-2 space-y-2 text-sm text-zinc-700">
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
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <div className="font-semibold text-zinc-900">Целевые взносы</div>
            <div>—</div>
          </div>
          {(finance.membershipDebt !== null || finance.electricityDebt !== null) && (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
              <div className="font-semibold text-zinc-900">Итого</div>
              <div>
                Членские:{" "}
                {finance.membershipDebt === null ? "—" : `${finance.membershipDebt} ₽`}
              </div>
              <div>
                Электро:{" "}
                {finance.electricityDebt === null ? "—" : `${finance.electricityDebt} ₽`}
              </div>
            </div>
          )}
        </div>
        {!hasAnyFinanceData && (
          <p className="mt-2 text-xs text-zinc-600">
            Данные уточняются. Если вы недавно купили участок или сменились данные — отправьте обращение.
          </p>
        )}
        <div className="mt-4 space-y-2 text-sm text-zinc-700">
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
            street={plotInfo.street}
            plotNumber={plotInfo.plotNumber}
            lastReading={electricity?.lastReading ?? null}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Статистика</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
    </div>
  );

  const electricitySection = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <a
          href="#electricity"
          className="rounded-full border border-[#5E704F] px-4 py-2 text-xs font-semibold text-[#5E704F] transition-colors hover:bg-[#5E704F]/10"
        >
          Передать показания
        </a>
      </div>
      <div id="electricity" className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Электроэнергия</h2>
        <div className="mt-2 space-y-2 text-sm text-zinc-700">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <div className="font-semibold text-zinc-900">Последние показания</div>
            <div>
              {electricity?.lastReading != null ? electricity.lastReading : "Не переданы"}
            </div>
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
            <div>
              {electricity?.debt == null ? "Нет данных" : `${electricity.debt} ₽`}
            </div>
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
    </div>
  );

  const chargesSection = (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">Начисления</h2>
      {charges.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-700">Начислений пока нет.</p>
      ) : (
        <div className="mt-2 space-y-2 text-sm text-zinc-800">
          {charges.slice(0, 10).map((c) => {
            const decision = decisionMap.get(c.decisionId);
            const typeLabel =
              c.type === "membership"
                ? "Членские"
                : c.type === "target"
                  ? "Целевые"
                  : "Электроэнергия";
            return (
              <div key={c.id} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                <div className="flex justify-between">
                  <span>{c.period}</span>
                  <span className="font-semibold">{c.amount} ₽</span>
                </div>
                <div className="text-xs text-zinc-600">Тип: {typeLabel}</div>
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
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Обязательные документы</h2>
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
        <h2 className="text-lg font-semibold text-zinc-900">Документы</h2>
        <p className="mt-2 text-sm text-zinc-700">Устав, протоколы и решения размещены в разделе документов.</p>
        <Link
          href="/docs"
          className="mt-3 inline-flex rounded-full border border-[#5E704F] px-4 py-2 text-xs font-semibold text-[#5E704F] transition-colors hover:bg-[#5E704F]/10"
        >
          Открыть документы
        </Link>
      </div>
    </div>
  );

  const eventsSection = (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">Что нового</h2>
        {events.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs">
            <form action={markAllEvents}>
              <button
                type="submit"
                className="rounded-full border border-zinc-300 px-3 py-1 font-semibold text-zinc-800 hover:border-zinc-400"
              >
                Отметить всё прочитанным
              </button>
            </form>
          </div>
        )}
      </div>
      {events.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-700">Пока нет новых уведомлений.</p>
      ) : (
        <div className="mt-3 space-y-3">
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
    <div id="appeals" className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900">Обращения</h2>
        <Link
          href="/admin/appeals"
          className="text-xs font-semibold text-[#5E704F] underline"
        >
          Админка обращений
        </Link>
      </div>
      <form action={submitAppeal} className="mt-3 space-y-3">
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
      <div className="mt-4 space-y-2 text-sm text-zinc-800">
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

  const sections: { key: SectionKey; title: string; content: React.ReactNode }[] = [
    { key: "home", title: "Домой (ЛК)", content: homeSection },
    { key: "finance", title: "Финансы", content: financeSection },
    { key: "electricity", title: "Электроэнергия", content: electricitySection },
    { key: "charges", title: "Начисления", content: chargesSection },
    { key: "docs", title: "Документы", content: docsSection },
    { key: "events", title: "Уведомления", content: eventsSection },
    { key: "appeals", title: "Обращения", content: appealsSection },
  ];

  return <CabinetShell sections={sections} unreadCount={unreadCount} />;
}
