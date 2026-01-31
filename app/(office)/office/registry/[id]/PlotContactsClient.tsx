"use client";

import { useState } from "react";
import AppLink from "@/components/AppLink";
import { apiPost } from "@/lib/api/client";

type Props = {
  plotId: string;
  ownerName?: string | null;
  phone?: string | null;
  email?: string | null;
  contactVerifiedAt?: string | null;
  contactVerifiedBy?: string | null;
  canManage?: boolean;
};

export default function PlotContactsClient({
  plotId,
  ownerName,
  phone,
  email,
  contactVerifiedAt,
  contactVerifiedBy,
  canManage = false,
}: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const handleCopy = async (text: string, type: "phone" | "email" | "name") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      // Игнорируем ошибки копирования
    }
  };

  const handleCall = (phoneNumber: string) => {
    window.location.href = `tel:${phoneNumber}`;
  };

  const handleVerifyToggle = async () => {
    if (!canManage) return;
    setVerifying(true);
    setVerifyError(null);
    try {
      await apiPost(`/api/office/registry/${plotId}/contact-verify`, {
        verified: !contactVerifiedAt,
      });
      window.location.reload();
    } catch (e) {
      setVerifyError(e instanceof Error ? e.message : "Ошибка подтверждения");
    } finally {
      setVerifying(false);
    }
  };

  if (!ownerName && !phone && !email) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center" data-testid="plot-contacts-empty">
        <p className="text-sm text-zinc-600">Контактная информация не указана</p>
        <AppLink
          href={`/office/registry/${plotId}/edit`}
          className="mt-3 inline-block rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
          data-testid="plot-contacts-edit-link"
        >
          Добавить контакты
        </AppLink>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="plot-contacts-list">
      {ownerName && (
        <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3" data-testid="plot-contact-name">
          <div>
            <div className="text-xs uppercase tracking-wide text-zinc-500">Владелец</div>
            <div className="mt-1 font-semibold text-zinc-900">{ownerName}</div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleCopy(ownerName, "name")}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
              data-testid="plot-contact-copy-name"
              title="Скопировать имя"
            >
              {copied === "name" ? "✓ Скопировано" : "Копировать"}
            </button>
          </div>
        </div>
      )}

      {phone && (
        <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3" data-testid="plot-contact-phone">
          <div>
            <div className="text-xs uppercase tracking-wide text-zinc-500">Телефон</div>
            <div className="mt-1 font-semibold text-zinc-900">
              <a href={`tel:${phone}`} className="hover:text-[#5E704F]">
                {phone}
              </a>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleCall(phone)}
              className="rounded-lg bg-[#5E704F] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#4d5d41]"
              data-testid="plot-contact-call"
              title="Позвонить"
            >
              Позвонить
            </button>
            <button
              onClick={() => handleCopy(phone, "phone")}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
              data-testid="plot-contact-copy-phone"
              title="Скопировать телефон"
            >
              {copied === "phone" ? "✓" : "Копировать"}
            </button>
          </div>
        </div>
      )}

      {email && (
        <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3" data-testid="plot-contact-email">
          <div>
            <div className="text-xs uppercase tracking-wide text-zinc-500">Email</div>
            <div className="mt-1 font-semibold text-zinc-900">
              <a href={`mailto:${email}`} className="hover:text-[#5E704F]">
                {email}
              </a>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleCopy(email, "email")}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
              data-testid="plot-contact-copy-email"
              title="Скопировать email"
            >
              {copied === "email" ? "✓ Скопировано" : "Копировать"}
            </button>
          </div>
        </div>
      )}

      <div className="pt-2">
        <div className="flex flex-wrap items-center gap-2">
          <AppLink
            href={`/office/registry/${plotId}/edit`}
            className="inline-block rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            data-testid="plot-contacts-edit-link"
          >
            Редактировать контакты
          </AppLink>
          {canManage && (
            <button
              type="button"
              onClick={handleVerifyToggle}
              disabled={verifying}
              className="inline-flex items-center rounded-lg border border-[#5E704F] px-3 py-2 text-sm font-semibold text-[#5E704F] hover:bg-[#5E704F]/10 disabled:opacity-50"
              data-testid="plot-contacts-verify"
            >
              {contactVerifiedAt ? "Снять подтверждение" : "Подтвердить контакты"}
            </button>
          )}
          {contactVerifiedAt && (
            <span className="text-xs text-emerald-700">
              Подтверждено {new Date(contactVerifiedAt).toLocaleDateString("ru-RU")}
              {contactVerifiedBy ? ` • ${contactVerifiedBy}` : ""}
            </span>
          )}
        </div>
        {verifyError && <div className="mt-2 text-xs text-red-600">{verifyError}</div>}
      </div>
    </div>
  );
}
