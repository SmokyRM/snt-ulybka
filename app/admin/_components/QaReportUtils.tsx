"use client";

import { useState, useCallback } from "react";

// Простой toast компонент
export function useToast() {
  const [toast, setToast] = useState<{ message: string; show: boolean } | null>(null);

  const showToast = useCallback((message: string) => {
    setToast({ message, show: true });
    setTimeout(() => {
      setToast({ message, show: false });
    }, 3000);
  }, []);

  const ToastComponent = toast?.show ? (
    <div
      className="fixed bottom-4 right-4 z-50 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800 shadow-lg"
      role="alert"
    >
      {toast.message}
    </div>
  ) : null;

  return { showToast, ToastComponent };
}

// Modal для fallback копирования
export function CopyReportModal({
  open,
  onClose,
  content,
  testId,
}: {
  open: boolean;
  onClose: () => void;
  content: string;
  testId?: string;
}) {
  if (!open) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      onClose();
    } catch (err) {
      // Fallback уже в modal
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      data-testid={testId}
    >
      <div
        className="w-full max-w-2xl rounded-lg border border-zinc-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-900">Отчёт (JSON)</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>
        <textarea
          readOnly
          value={content}
          className="mb-4 w-full rounded border border-zinc-300 p-3 font-mono text-xs"
          rows={15}
          onClick={(e) => (e.target as HTMLTextAreaElement).select()}
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            Закрыть
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="rounded bg-[#5E704F] px-4 py-2 text-sm font-medium text-white hover:bg-[#4a5a3d]"
          >
            Скопировать
          </button>
        </div>
      </div>
    </div>
  );
}

// Утилита для скачивания JSON
export function downloadJson(content: string, filename: string) {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
