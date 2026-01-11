import Link from "next/link";
import { formatPhoneDisplay, isPlaceholderPhone } from "@/lib/phone";
import { OFFICIAL_CHANNELS } from "@/config/officialChannels";

export default function Footer() {
  const year = new Date().getFullYear();
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME;
  const updatedSource = buildTime ? new Date(buildTime) : null;
  const updatedLabel =
    updatedSource && !Number.isNaN(updatedSource.getTime())
      ? `${new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(
          updatedSource,
        )}, ${new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(
          updatedSource,
        )}`
      : null;
  const phone = typeof OFFICIAL_CHANNELS.phone === "string" ? OFFICIAL_CHANNELS.phone : "";
  const validPhone = phone && !isPlaceholderPhone(phone) ? phone : null;
  return (
    <footer className="border-t border-[#5E704F]/15 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 text-sm text-zinc-600 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <div className="text-zinc-900">
              <span className="font-semibold">СНТ «Улыбка»</span>
            </div>
            <div className="text-xs text-zinc-600">
              © {year} Официальный сайт СНТ «Улыбка», г. Снежинск
            </div>
            <div className="text-xs text-zinc-600">
              Телефон:{" "}
              {validPhone ? (
                <a
                  href={`tel:${String(validPhone).replace(/\s+/g, "")}`}
                  className="text-[#5E704F] hover:underline"
                >
                  {validPhone}
                </a>
              ) : (
                "Телефон уточняется"
              )}
            </div>
            {updatedLabel ? (
              <Link
                href="/updates"
                className="text-xs text-zinc-500 transition hover:text-zinc-600 hover:underline"
              >
                Обновлено: {updatedLabel}
              </Link>
            ) : null}
          </div>
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Портал
            </div>
            <div className="flex flex-col gap-2 text-sm text-zinc-700">
              <Link href="/about" className="text-[#5E704F] hover:underline">
                О портале
              </Link>
              <Link href="/access" className="text-[#5E704F] hover:underline">
                Как получить доступ
              </Link>
              <Link href="/help" className="text-[#5E704F] hover:underline">
                Помощь
              </Link>
              <Link href="/knowledge" className="text-[#5E704F] hover:underline">
                База знаний
              </Link>
              <Link href="/updates" className="text-[#5E704F] hover:underline">
                Что нового
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
