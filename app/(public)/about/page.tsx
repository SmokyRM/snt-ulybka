import AppLink from "@/components/AppLink";
import { getPaymentDetailsSettingServer } from "@/lib/settings.server";
import { getOfficialChannelsSettingServer } from "@/lib/settings.server";
import { siteName } from "@/config/site";

export const metadata = {
  alternates: {
    canonical: "/about",
  },
};

const formatUrlLabel = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.hostname + parsed.pathname;
  } catch {
    return url;
  }
};

export default async function AboutPage() {
  const paymentDetails = getPaymentDetailsSettingServer();
  const channels = getOfficialChannelsSettingServer();
  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-10">
        <section className="space-y-3">
          <h1 className="text-3xl font-semibold">О портале</h1>
          <p className="text-base text-zinc-700">
            {siteName} использует официальный портал для информирования собственников, обмена
            документами и обращений в правление. Доступ в личный кабинет предоставляется после
            проверки права на участок, чтобы защитить данные членов товарищества.
          </p>
          <p className="text-sm text-zinc-600">
            Портал администрируется правлением СНТ и является официальным каналом для публикации
            объявлений и документов.
          </p>
        </section>

        <section className="grid gap-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold">Контакты и реквизиты</h2>
            <p className="text-sm text-zinc-600">
              При необходимости уточняйте информацию через правление.
            </p>
          </div>
          <div className="grid gap-4 text-sm text-zinc-700 sm:grid-cols-2">
            <div className="space-y-1">
              <div className="font-semibold text-zinc-900">Реквизиты</div>
              <div>Получатель: {paymentDetails.value.receiver}</div>
              <div>ИНН/КПП: {paymentDetails.value.inn} / {paymentDetails.value.kpp}</div>
              <div>Р/с: {paymentDetails.value.account}</div>
              <div>Банк: {paymentDetails.value.bank}</div>
              <div>БИК: {paymentDetails.value.bic}</div>
              <div>Корр. счёт: {paymentDetails.value.corr}</div>
              {paymentDetails.value.address && (
                <div>Адрес: {paymentDetails.value.address}</div>
              )}
              {paymentDetails.value.chairman && (
                <div>Председатель: {paymentDetails.value.chairman}</div>
              )}
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-zinc-900">Официальные каналы</div>
              {channels.value.vk && (
                <a
                  href={channels.value.vk}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-[#5E704F] underline"
                >
                  VK: {formatUrlLabel(channels.value.vk)}
                </a>
              )}
              {channels.value.telegram && (
                <a
                  href={channels.value.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-[#5E704F] underline"
                >
                  Telegram: {formatUrlLabel(channels.value.telegram)}
                </a>
              )}
              {channels.value.email && (
                <div>Email: {channels.value.email}</div>
              )}
              {channels.value.phone && (
                <div>Телефон: {channels.value.phone}</div>
              )}
              <AppLink href="/contacts" className="block text-[#5E704F] underline">
                Контакты правления
              </AppLink>
            </div>
          </div>
        </section>

        <section className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Полезные разделы</h2>
          <div className="flex flex-wrap gap-3 text-sm">
            <AppLink
              href="/docs"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
            >
              Документы
            </AppLink>
            <AppLink
              href="/access"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
            >
              Как получить доступ
            </AppLink>
          </div>
        </section>
      </div>
    </main>
  );
}
