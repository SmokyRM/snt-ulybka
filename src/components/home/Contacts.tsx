"use client";

import { useState } from "react";
import { PAYMENT_DETAILS } from "@/config/paymentDetails";
import { OFFICIAL_CHANNELS } from "@/config/officialChannels";

export default function Contacts() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!navigator?.clipboard) {
      return;
    }
    const shortReq = `${PAYMENT_DETAILS.receiver}, ИНН ${PAYMENT_DETAILS.inn}, КПП ${PAYMENT_DETAILS.kpp}, р/с ${PAYMENT_DETAILS.account}, БИК ${PAYMENT_DETAILS.bic}`;
    await navigator.clipboard.writeText(shortReq);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="contacts" className="scroll-mt-24 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mb-8 flex items-center justify-between gap-6">
          <h2 className="text-2xl font-semibold text-zinc-900">Контакты</h2>
          <span className="text-sm text-zinc-600">
            Правление и реквизиты
          </span>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-zinc-200/70 bg-white/90 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-zinc-900">
              Контакты правления
            </h3>
            <div className="mt-4 space-y-2 text-sm text-zinc-700">
              <p>
                Телефон:{" "}
                <a
                  href="tel:+79000000000"
                  className="text-[#5E704F] underline decoration-[#5E704F]/50 underline-offset-4"
                >
                  +7 (900) 000-00-00
                </a>
              </p>
              <p>VK:{" "}
                <a
                  href={OFFICIAL_CHANNELS.vk}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#5E704F] underline decoration-[#5E704F]/50 underline-offset-4"
                >
                  vk.com/snt_smile
                </a>
              </p>
              <p>Telegram:{" "}
                <a
                  href={OFFICIAL_CHANNELS.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#5E704F] underline decoration-[#5E704F]/50 underline-offset-4"
                >
                  t.me/snt_smile
                </a>
              </p>
              <p>Часы приема: пн–ср, 18:00–20:00</p>
            </div>
            <div
              id="appeal"
              className="mt-6 scroll-mt-24 rounded-xl border border-[#5E704F]/20 bg-[#5E704F]/5 p-4 text-sm text-zinc-700"
            >
              Обращения принимаются по электронной почте или на личном приеме.
            </div>
          </article>
          <article className="rounded-2xl border border-zinc-200/70 bg-white/90 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-zinc-900">
              Реквизиты (кратко)
            </h3>
            <p className="mt-4 text-sm leading-6 text-zinc-700">
              {PAYMENT_DETAILS.receiver}, ИНН {PAYMENT_DETAILS.inn}, КПП {PAYMENT_DETAILS.kpp},
              р/с {PAYMENT_DETAILS.account}, БИК {PAYMENT_DETAILS.bic}
            </p>
            <button
              type="button"
              onClick={handleCopy}
              className="mt-6 inline-flex rounded-full border border-[#5E704F] px-5 py-2 text-sm font-semibold text-[#5E704F] transition-colors hover:bg-[#5E704F]/10"
            >
              {copied ? "Скопировано" : "Скопировать"}
            </button>
          </article>
        </div>
      </div>
    </section>
  );
}
