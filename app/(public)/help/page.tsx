import Link from "next/link";
import { getPublicContent } from "@/lib/publicContentStore";

export const metadata = {
  alternates: {
    canonical: "/help",
  },
};

export default async function HelpPage() {
  const content = await getPublicContent();
  const contacts = content.contacts;
  const phone = contacts.phone || "—";
  const email = contacts.email || "—";
  const telegram = contacts.telegram;
  const vk = contacts.vk;
  const payment = content.paymentDetails;
  const phoneHref = phone !== "—" ? `tel:${phone.replace(/[^+\d]/g, "")}` : "";
  const emailHref = email !== "—" ? `mailto:${email}` : "";
  const formatExternalUrl = (value: string) =>
    value.startsWith("http") ? value : `https://${value}`;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-10 px-4 py-10 sm:px-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Помощь</h1>
        <p className="text-sm text-zinc-600">
          Короткие ответы на основные вопросы по доступу и оплате.
        </p>
      </header>

      <section id="verification" className="space-y-3">
        <h2 className="text-lg font-semibold">Как проходит проверка</h2>
        <ul className="space-y-2 text-sm text-zinc-700">
          <li>• Проверяем связь с участком и право владения.</li>
          <li>• Обычно это занимает 1–2 рабочих дня.</li>
          <li>• Документы запрашиваем только при необходимости (выписка ЕГРН/договор).</li>
          <li>• После подтверждения открывается полный доступ к кабинету.</li>
        </ul>
        <Link className="text-sm text-[#5E704F] underline" href="/login">
          Перейти ко входу
        </Link>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Как подтвердить членство</h2>
        <p className="text-sm text-zinc-700">
          Заполните профиль (ФИО и телефон), подайте заявку на подтверждение
          членства в кабинете и дождитесь решения правления.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Где смотреть взносы и долги</h2>
        <p className="text-sm text-zinc-700">
          Информация о начислениях и задолженностях доступна в разделе «Финансы»
          личного кабинета после подтверждения членства.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Как оплатить</h2>
        <p className="text-sm text-zinc-700">
          Используйте реквизиты СНТ и указывайте в назначении: улицу, участок и
          тип платежа. Пример: «Членские взносы, ул. Центральная, уч. 8».
        </p>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
          <div className="font-semibold text-zinc-900">Реквизиты</div>
          <div>Получатель: {payment.receiver}</div>
          <div>ИНН/КПП: {payment.inn} / {payment.kpp}</div>
          <div>Р/с: {payment.account}</div>
          <div>Банк: {payment.bank}</div>
          <div>БИК: {payment.bic}</div>
          <div>К/с: {payment.corr}</div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Куда обратиться</h2>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
          <div>
            Телефон:{" "}
            {phone !== "—" ? (
              <a href={phoneHref} className="text-[#5E704F] underline">
                {phone}
              </a>
            ) : (
              "—"
            )}
          </div>
          <div>
            Почта:{" "}
            {email !== "—" ? (
              <a href={emailHref} className="text-[#5E704F] underline">
                {email}
              </a>
            ) : (
              "—"
            )}
          </div>
          <div>
            Telegram:{" "}
            {telegram ? (
              <a
                href={formatExternalUrl(telegram)}
                className="text-[#5E704F] underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {telegram}
              </a>
            ) : (
              "—"
            )}
          </div>
          <div>
            VK:{" "}
            {vk ? (
              <a
                href={formatExternalUrl(vk)}
                className="text-[#5E704F] underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {vk}
              </a>
            ) : (
              "—"
            )}
          </div>
        </div>
      </section>

      <section id="privacy" className="space-y-3">
        <h2 className="text-lg font-semibold">Безопасность и персональные данные</h2>
        <ul className="space-y-2 text-sm text-zinc-700">
          <li>• Данные используются только для работы портала СНТ: подтверждения доступа и связи.</li>
          <li>• Другие жители не видят ваши персональные данные.</li>
          <li>• Заявки на проверку видит только правление.</li>
          <li>• Можно запросить исправление или удаление данных.</li>
        </ul>
      </section>
    </div>
  );
}
