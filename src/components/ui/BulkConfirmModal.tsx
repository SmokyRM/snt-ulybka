"use client";

import { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  title: string;
  description: string;
  count: number;
  requireConfirmText?: boolean;
  requireReason?: boolean;
  confirmText?: string;
  loading?: boolean;
};

export default function BulkConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  count,
  requireConfirmText = false,
  requireReason = false,
  confirmText = "CONFIRM",
  loading = false,
}: Props) {
  const [inputValue, setInputValue] = useState("");
  const [reason, setReason] = useState("");

  const canConfirm =
    (!requireConfirmText || inputValue === confirmText) && (!requireReason || reason.trim().length > 0);

  const handleConfirm = () => {
    if (canConfirm) {
      onConfirm(reason.trim() || undefined);
      setInputValue("");
      setReason("");
    }
  };

  const handleClose = () => {
    setInputValue("");
    setReason("");
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={handleClose}
      data-testid="bulk-confirm-modal"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
        <p className="mt-2 text-sm text-zinc-600">{description}</p>

        <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
          <p className="text-sm font-medium text-amber-800">
            Будет затронуто записей: <span className="font-bold">{count}</span>
          </p>
        </div>

        {requireConfirmText && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-zinc-700">
              Введите <span className="font-mono bg-zinc-100 px-1 rounded">{confirmText}</span> для
              подтверждения:
            </label>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-[#5E704F] focus:ring-1 focus:ring-[#5E704F]"
              placeholder={confirmText}
              autoFocus
              data-testid="bulk-confirm-input"
            />
          </div>
        )}

        {requireReason && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-zinc-700">
              Причина (обязательно):
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-[#5E704F] focus:ring-1 focus:ring-[#5E704F]"
              rows={2}
              placeholder="Укажите причину изменения..."
              data-testid="bulk-confirm-reason"
            />
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm || loading}
            className="rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#4d5d41] disabled:opacity-50"
            data-testid="bulk-confirm-submit"
          >
            {loading ? "Выполняется..." : "Подтвердить"}
          </button>
        </div>
      </div>
    </div>
  );
}
