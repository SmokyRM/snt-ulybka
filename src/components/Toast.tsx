"use client";

import { useEffect } from "react";

type ToastProps = {
  type: "success" | "error" | "info" | "warning";
  message: string;
  onClose?: () => void;
  autoClose?: number;
};

export default function Toast({ type, message, onClose, autoClose = 5000 }: ToastProps) {
  useEffect(() => {
    if (autoClose > 0 && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoClose);
      return () => clearTimeout(timer);
    }
  }, [autoClose, onClose]);

  const bgColor =
    type === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : type === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : type === "warning"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <div
      role="alert"
      className={`rounded border px-3 py-2 text-sm ${bgColor}`}
      data-testid={`toast-${type}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span>{message}</span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="ml-2 text-current opacity-70 transition hover:opacity-100"
            aria-label="Закрыть"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
