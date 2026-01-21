"use client";

import { useState, useEffect } from "react";
import type { MessageTemplate } from "@/lib/billing";
import { readOk } from "@/lib/api/client";

interface PreviewDialogProps {
  open: boolean;
  onClose: () => void;
  template: MessageTemplate;
  plotIds: string[];
  onSend: (templateId: string, plotIds: string[], channel: "sms" | "telegram" | "email" | "site", simulate: boolean) => void;
}

export default function PreviewDialog({ open, onClose, template, plotIds, onSend }: PreviewDialogProps) {
  const [plots, setPlots] = useState<Array<{ id: string; street: string; plotNumber: string; ownerName?: string; debtAmount?: string; periods?: string }>>([]);
  const [channel, setChannel] = useState<"sms" | "telegram" | "email" | "site">("site");
  const [previewPlotId, setPreviewPlotId] = useState<string | null>(null);
  const [previewMessage, setPreviewMessage] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setPlots([]);
      setPreviewPlotId(null);
      setPreviewMessage("");
      return;
    }
    if (plotIds.length > 0) {
      // Load plots for preview (using mock data for now)
      // In real implementation, fetch from API
      // Use setTimeout to ensure component is mounted
      const timeoutId = setTimeout(() => {
        loadPlotsData();
      }, 0);
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, plotIds.join(",")]);

  const loadPlotsData = async () => {
    // For now, use mock data structure
    // In real implementation, fetch from API: /api/admin/billing/notifications/preview
    try {
      const res = await fetch("/api/admin/billing/notifications/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plotIds }),
      });
      const data = await readOk<{
        plots?: Array<{ id: string; street: string; plotNumber: string; ownerName?: string; debtAmount?: string; periods?: string }>;
      }>(res);
      if (data.plots) {
        setPlots(data.plots);
        if (data.plots.length > 0) {
          setPreviewPlotId(data.plots[0].id);
        }
        return;
      }
    } catch {
      // Fall through to mock data
    }

    // Fallback to mock data
    const mockPlots = plotIds.map((id) => ({
      id,
      street: "Центральная",
      plotNumber: id.slice(-2),
      ownerName: "Иванов Иван Иванович",
      debtAmount: "5000.00",
      periods: "2025-01: 5000.00 ₽",
    }));

    setPlots(mockPlots);
    if (plotIds.length > 0) {
      setPreviewPlotId(plotIds[0]);
    }
  };

  useEffect(() => {
    if (previewPlotId && plots.length > 0) {
      const plot = plots.find((p) => p.id === previewPlotId);
      if (plot) {
        const message = template.message
          .replace(/\{plotNumber\}/g, plot.plotNumber)
          .replace(/\{ownerName\}/g, plot.ownerName || "Не указано")
          .replace(/\{debtAmount\}/g, plot.debtAmount || "0.00")
          .replace(/\{periods\}/g, plot.periods || "Нет периодов")
          .replace(/\{street\}/g, plot.street || "");
        setPreviewMessage(message);
      }
    } else if (plots.length === 0) {
      setPreviewMessage("");
    }
  }, [previewPlotId, plots, template.message]);

  if (!open) return null;

  const handleSimulate = () => {
    if (plotIds.length === 0) {
      alert("Выберите участки для отправки");
      return;
    }
    onSend(template.id, plotIds, channel, true);
    onClose();
  };

  const handleSend = () => {
    if (plotIds.length === 0) {
      alert("Выберите участки для отправки");
      return;
    }
    if (!confirm(`Отправить уведомления на ${plotIds.length} участков?`)) return;
    onSend(template.id, plotIds, channel, false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-3xl rounded-2xl border border-zinc-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-zinc-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-zinc-900">Предпросмотр и отправка</h2>
        </div>

        <div className="px-6 py-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Канал отправки
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as "sms" | "telegram" | "email" | "site")}
                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              >
                <option value="site">Сайт (уведомление)</option>
                <option value="telegram">Telegram</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
            </div>

            {plotIds.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Предпросмотр для участка
                </label>
                <select
                  value={previewPlotId || ""}
                  onChange={(e) => setPreviewPlotId(e.target.value || null)}
                  className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                >
                  {plots.map((plot) => (
                    <option key={plot.id} value={plot.id}>
                      {plot.street}, {plot.plotNumber} — {(plot.ownerName || "Не указано")}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Предпросмотр сообщения
              </label>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 whitespace-pre-wrap text-sm font-mono min-h-[200px]">
                {previewMessage || "Загрузка предпросмотра..."}
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-medium">К отправке: {plotIds.length} участков</p>
              <p className="mt-1 text-xs">
                {channel === "telegram" || channel === "sms" || channel === "email"
                  ? "Отправка будет залогирована (симуляция). Реальная отправка не выполняется."
                  : "Уведомление будет отправлено через систему сайта."}
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3 border-t border-zinc-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSimulate}
              disabled={plotIds.length === 0}
              className="rounded-full border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-zinc-300 disabled:text-zinc-400"
            >
              Симулировать отправку
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={plotIds.length === 0}
              className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41] disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              Отправить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
