"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { CabinetCard } from "../../../../cabinet/_components/CabinetCard";
import { CabinetHeader } from "../../../../cabinet/_components/CabinetHeader";
import { apiPost, apiPostRaw } from "@/lib/api/client";

type PaymentMethod = "cash" | "card" | "bank" | "other";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Наличные",
  card: "Карта",
  bank: "Банковский перевод",
  other: "Другое",
};

type Props = {
  plotNumber: string | null;
};

type UploadedFile = {
  url: string;
  mime: string;
  size: number;
  filename: string;
};

export default function ConfirmPaymentClient({ plotNumber }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [paidAt, setPaidAt] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("bank");
  const [comment, setComment] = useState("");
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const data = await apiPostRaw<{
        url: string;
        mime: string;
        size: number;
        filename: string;
      }>("/api/cabinet/payments/upload", formData);
      setUploadedFile({
        url: data.url,
        mime: data.mime,
        size: data.size,
        filename: data.filename,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки файла");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        paidAt,
        amount: parseFloat(amount),
        method,
        comment: comment.trim() || null,
        plotId: plotNumber,
      };

      if (uploadedFile) {
        payload.attachment = {
          fileName: uploadedFile.filename,
          filePath: uploadedFile.url,
          mimeType: uploadedFile.mime,
          size: uploadedFile.size,
        };
      }

      await apiPost("/api/cabinet/payments/confirmations", payload);

      setSuccess(true);
      setTimeout(() => {
        router.push("/cabinet/payments/confirmations");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка отправки подтверждения");
    } finally {
      setSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  };

  if (success) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4" data-testid="cabinet-payment-confirm-root">
        <CabinetHeader title="Подтверждение оплаты" />
        <CabinetCard title="Успешно" subtitle="Подтверждение отправлено">
          <div className="py-6 text-center">
            <div className="mb-3 text-4xl">✓</div>
            <div className="text-lg font-semibold text-emerald-700">Подтверждение отправлено</div>
            <div className="mt-2 text-sm text-zinc-600">
              Вы будете перенаправлены к списку подтверждений...
            </div>
          </div>
        </CabinetCard>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4" data-testid="cabinet-payment-confirm-root">
      <CabinetHeader
        title="Подтверждение оплаты"
        statusLine={plotNumber ? `Участок: ${plotNumber}` : undefined}
      />

      <CabinetCard title="Сообщить об оплате" subtitle="Заполните форму">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Дата оплаты <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[#5E704F] focus:outline-none focus:ring-1 focus:ring-[#5E704F]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Сумма (руб.) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              placeholder="0.00"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[#5E704F] focus:outline-none focus:ring-1 focus:ring-[#5E704F]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Способ оплаты <span className="text-rose-500">*</span>
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              required
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[#5E704F] focus:outline-none focus:ring-1 focus:ring-[#5E704F]"
            >
              {Object.entries(METHOD_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Комментарий
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Номер платежа, назначение и т.д."
              rows={3}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[#5E704F] focus:outline-none focus:ring-1 focus:ring-[#5E704F]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Чек / квитанция
            </label>
            {uploadedFile ? (
              <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📄</span>
                  <div>
                    <div className="text-sm font-medium text-zinc-800">{uploadedFile.filename}</div>
                    <div className="text-xs text-zinc-500">{formatFileSize(uploadedFile.size)}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="rounded px-2 py-1 text-sm text-rose-600 hover:bg-rose-50"
                >
                  Удалить
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
                <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 px-4 py-6 text-center transition hover:border-[#5E704F]">
                  {uploading ? (
                    <span className="text-sm text-zinc-500">Загрузка...</span>
                  ) : (
                    <div>
                      <span className="text-2xl">📎</span>
                      <div className="mt-1 text-sm text-zinc-600">
                        Нажмите или перетащите файл
                      </div>
                      <div className="text-xs text-zinc-400">
                        JPG, PNG, WebP или PDF до 10 МБ
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={submitting || !amount || !paidAt}
              data-testid="cabinet-payment-confirm-submit"
              className="flex-1 rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4d5d41] disabled:opacity-50"
            >
              {submitting ? "Отправка..." : "Отправить"}
            </button>
          </div>
        </form>
      </CabinetCard>

      <CabinetCard title="Как это работает?" subtitle="Информация">
        <div className="space-y-2 text-sm text-zinc-600">
          <p>1. Заполните форму с данными об оплате</p>
          <p>2. Приложите фото чека или квитанции (рекомендуется)</p>
          <p>3. Отправьте подтверждение на рассмотрение</p>
          <p>4. Правление проверит и подтвердит оплату</p>
        </div>
      </CabinetCard>
    </div>
  );
}
