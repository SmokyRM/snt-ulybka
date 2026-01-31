"use client";

import { useState, useEffect, useCallback } from "react";
import { apiGet } from "@/lib/api/client";

type RequisitesData = {
  title: string;
  recipientName: string;
  inn: string;
  kpp: string;
  bankName: string;
  bik: string;
  account: string;
  corrAccount: string;
};

type PaymentDetailsResponse = {
  requisites: RequisitesData;
  payment: {
    period: string;
    amount: number;
    purpose: string;
    plotLabel: string;
    userName: string;
  };
  qr: {
    content: string | null;
    valid: boolean;
    errors: string[];
  };
};

function CopyButton({ text, testId }: { text: string; testId: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
      data-testid={testId}
    >
      {copied ? "Скопировано!" : "Копировать"}
    </button>
  );
}

function QRCodeDisplay({ content }: { content: string }) {
  // Simple QR code placeholder - for production, use a proper QR library
  // The content is in ГОСТ Р 56042-2014 format
  // Using a simple inline SVG placeholder (content is used for future QR generation)
  void content; // Acknowledge content param for future QR generation

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
      <rect width="200" height="200" fill="white"/>
      <rect x="10" y="10" width="180" height="180" fill="none" stroke="#e4e4e7" stroke-width="2" rx="8"/>
      <text x="100" y="90" text-anchor="middle" fill="#71717a" font-size="12" font-family="system-ui">QR код</text>
      <text x="100" y="110" text-anchor="middle" fill="#71717a" font-size="10" font-family="system-ui">для оплаты</text>
      <text x="100" y="130" text-anchor="middle" fill="#a1a1aa" font-size="8" font-family="system-ui">(Сбербанк, Тинькофф)</text>
    </svg>
  `;

  // Use btoa safely - this runs client-side only
  const dataUrl = typeof window !== "undefined" ? `data:image/svg+xml;base64,${btoa(svg)}` : null;

  if (!dataUrl) {
    return (
      <div className="flex h-[200px] w-[200px] items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dataUrl}
        alt="QR код для оплаты"
        className="h-[200px] w-[200px] rounded-lg border border-zinc-200"
        data-testid="cabinet-pay-qr"
      />
      <div className="text-xs text-zinc-500">Сканируйте в приложении банка</div>
    </div>
  );
}

export default function HowToPayClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PaymentDetailsResponse | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await apiGet<PaymentDetailsResponse>("/api/cabinet/payment-details");
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка загрузки реквизитов");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) {
    return (
      <div
        className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
        data-testid="cabinet-pay-howto"
      >
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
        data-testid="cabinet-pay-howto"
      >
        <div className="text-center text-sm text-red-600">{error}</div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { requisites, payment, qr } = data;

  return (
    <div
      className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
      data-testid="cabinet-pay-howto"
    >
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">Как оплатить</h3>
          <p className="text-sm text-zinc-600">Реквизиты для перевода</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Requisites and Purpose */}
        <div className="space-y-4">
          {/* Requisites */}
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
              <span className="text-zinc-500">Получатель:</span>
              <span className="font-medium text-zinc-900">{requisites.recipientName}</span>

              <span className="text-zinc-500">ИНН:</span>
              <span className="font-medium text-zinc-900">{requisites.inn}</span>

              <span className="text-zinc-500">КПП:</span>
              <span className="font-medium text-zinc-900">{requisites.kpp}</span>

              <span className="text-zinc-500">Банк:</span>
              <span className="font-medium text-zinc-900">{requisites.bankName}</span>

              <span className="text-zinc-500">БИК:</span>
              <span className="font-medium text-zinc-900">{requisites.bik}</span>

              <span className="text-zinc-500">Р/счёт:</span>
              <span className="font-mono text-xs font-medium text-zinc-900">{requisites.account}</span>

              <span className="text-zinc-500">Корр. счёт:</span>
              <span className="font-mono text-xs font-medium text-zinc-900">{requisites.corrAccount}</span>
            </div>
          </div>

          {/* Payment Purpose */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                Назначение платежа
              </span>
              <CopyButton text={payment.purpose} testId="cabinet-pay-copy" />
            </div>
            <div
              className="text-sm font-medium text-zinc-900"
              data-testid="cabinet-pay-purpose"
            >
              {payment.purpose}
            </div>
          </div>

          {/* Amount info */}
          {payment.amount > 0 && (
            <div className="text-sm text-zinc-600">
              Сумма к оплате:{" "}
              <span className="font-semibold text-zinc-900">
                {payment.amount.toLocaleString("ru-RU")} ₽
              </span>
            </div>
          )}
        </div>

        {/* Right: QR Code */}
        <div className="flex justify-center lg:justify-end">
          {qr.valid && qr.content ? (
            <QRCodeDisplay content={qr.content} />
          ) : (
            <div
              className="flex h-[200px] w-[200px] items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-center text-sm text-zinc-500"
              data-testid="cabinet-pay-qr"
            >
              QR код недоступен
              {qr.errors.length > 0 && (
                <div className="mt-1 text-xs text-red-500">{qr.errors.join(", ")}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-4 rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-xs text-zinc-600">
        <strong>Инструкция:</strong> Скопируйте назначение платежа и вставьте его при переводе через
        интернет-банк или мобильное приложение. Вы также можете отсканировать QR-код в приложении
        Сбербанк, Тинькофф или другого банка.
      </div>
    </div>
  );
}
