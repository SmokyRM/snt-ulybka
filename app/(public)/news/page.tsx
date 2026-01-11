import Link from "next/link";
import { OFFICIAL_CHANNELS } from "@/config/officialChannels";

export const metadata = {
  title: "Новости — СНТ «Улыбка»",
  alternates: {
    canonical: "/news",
  },
};

export default function NewsPage() {
  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-2xl">
        <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">Новости</h1>
          <p className="text-sm text-zinc-700">
            Раздел в разработке. Важные объявления пока публикуем в официальных каналах.
          </p>
          <div className="space-y-2 text-sm text-zinc-700">
            {OFFICIAL_CHANNELS.telegram ? (
              <a
                href={OFFICIAL_CHANNELS.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border border-zinc-200 px-3 py-2 text-[#5E704F] hover:border-[#5E704F]"
              >
                Telegram: {OFFICIAL_CHANNELS.telegram}
              </a>
            ) : null}
            {OFFICIAL_CHANNELS.vk ? (
              <a
                href={OFFICIAL_CHANNELS.vk}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border border-zinc-200 px-3 py-2 text-[#5E704F] hover:border-[#5E704F]"
              >
                VK: {OFFICIAL_CHANNELS.vk}
              </a>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/" className="text-zinc-600 transition hover:text-[#5E704F]">
              ← На главную
            </Link>
            <Link href="/cabinet" className="text-zinc-600 transition hover:text-[#5E704F]">
              В кабинет
            </Link>
            <Link href="/help" className="text-zinc-600 transition hover:text-[#5E704F]">
              Справка
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
