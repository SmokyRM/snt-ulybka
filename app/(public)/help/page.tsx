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
  const payment = content.paymentDetails;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-10 px-4 py-10 sm:px-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Помощь</h1>
        <p className="text-sm text-zinc-600">
          Короткие ответы на основные вопросы по доступу и оплате.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Как получить доступ и войти</h2>
        <p className="text-sm text-zinc-700">
          Получите код участка у правления, затем введите его на странице входа.
          После заполнения профиля откроется личный кабинет.
        </p>
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
          <div>Телефон: {contacts.phone}</div>
          <div>Почта: {contacts.email}</div>
          <div>
            Telegram:{" "}
            <a
              href={contacts.telegram}
              className="text-[#5E704F] underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {contacts.telegram}
            </a>
          </div>
          <div>
            VK:{" "}
            <a
              href={contacts.vk}
              className="text-[#5E704F] underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {contacts.vk}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
