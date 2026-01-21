"use client";

import { useEffect, useState } from "react";
import type { MessageTemplate, NotificationSendLog } from "@/lib/billing";
import TemplateDialog from "./TemplateDialog";
import PreviewDialog from "./PreviewDialog";
import { readOk } from "@/lib/api/client";

type MailingRow = { fullName: string; phone: string; debtTotal: number; text: string };

interface NotificationsClientProps {
  initialPlotIds: string[];
}

const CHANNEL_LABEL: Record<string, string> = { sms: "SMS", email: "Email", "whatsapp-draft": "WhatsApp (черн.)" };

export default function NotificationsClient({ initialPlotIds }: NotificationsClientProps) {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [periods, setPeriods] = useState<{ id: string; from: string; to: string; title?: string | null }[]>([]);
  const [logs, setLogs] = useState<NotificationSendLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [selectedPlotIds] = useState<Set<string>>(new Set(initialPlotIds));

  const [mailingPeriodId, setMailingPeriodId] = useState<string>("");
  const [mailingTemplateId, setMailingTemplateId] = useState<string>("");
  const [mailingRows, setMailingRows] = useState<MailingRow[]>([]);
  const [generating, setGenerating] = useState(false);

  const loadTemplates = async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/billing/notifications/templates", { cache: "no-store" });
      const { templates } = await readOk<{ templates: MessageTemplate[] }>(res);
      setTemplates(templates);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      const res = await fetch("/api/admin/billing/notifications/logs", { cache: "no-store" });
      const { logs } = await readOk<{ logs: NotificationSendLog[] }>(res);
      setLogs(logs);
    } catch {
      // Ignore errors
    }
  };

  const loadPeriods = async () => {
    try {
      const res = await fetch("/api/admin/billing/periods", { cache: "no-store" });
      const { periods } = await readOk<{ periods: { id: string; from: string; to: string; title?: string | null }[] }>(res);
      setPeriods(periods ?? []);
    } catch {
      setPeriods([]);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      loadTemplates();
      loadLogs();
      loadPeriods();
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateDialogOpen(true);
  };

  const handleEditTemplate = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setTemplateDialogOpen(true);
  };

  const handleSaveTemplate = async (data: { title: string; message: string; channel?: "sms" | "email" | "whatsapp-draft" }) => {
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const url = "/api/admin/billing/notifications/templates";
      const method = editingTemplate ? "PUT" : "POST";
      const body = editingTemplate
        ? { id: editingTemplate.id, ...data, variables: extractVariables(data.message) }
        : { ...data, variables: extractVariables(data.message) };
      if (data.channel != null) (body as Record<string, unknown>).channel = data.channel;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      await readOk<{ template: MessageTemplate }>(res);

      setMessage(editingTemplate ? "Шаблон обновлён" : "Шаблон создан");
      setTemplateDialogOpen(false);
      setEditingTemplate(null);
      await loadTemplates();

      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Удалить шаблон?")) return;

    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/billing/notifications/templates?id=${id}`, {
        method: "DELETE",
      });

      await readOk(res);

      setMessage("Шаблон удалён");
      await loadTemplates();
      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    setPreviewDialogOpen(true);
  };

  const handleSend = async (templateId: string, plotIds: string[], channel: "sms" | "telegram" | "email" | "site", simulate: boolean) => {
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/billing/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, plotIds, channel, simulate }),
      });

      const data = await readOk<{ summary: { total: number; sent: number; simulated: number; failed: number } }>(res);
      const summary = data.summary;
      setMessage(
        simulate
          ? `Симуляция: ${summary.simulated} отправлено, ${summary.failed} ошибок`
          : `Отправлено: ${summary.sent} успешно, ${summary.failed} ошибок`
      );

      await loadLogs();
      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const extractVariables = (message: string): string[] => {
    const matches = message.match(/\{([^}]+)\}/g);
    if (!matches) return [];
    return [...new Set(matches.map((m) => m.slice(1, -1)))];
  };

  const handleGenerateMailing = async () => {
    if (!mailingTemplateId) {
      setError("Выберите шаблон");
      return;
    }
    setGenerating(true);
    setError(null);
    setMailingRows([]);
    try {
      const res = await fetch("/api/admin/billing/notifications/mailing-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: mailingTemplateId, periodId: mailingPeriodId || null }),
      });
      const data = await readOk<{ rows: MailingRow[] }>(res);
      setMailingRows(data.rows ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const handleExportMailingCsv = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const header = "ФИО,телефон,долг,текст";
    const lines = mailingRows.map((r) =>
      [esc(r.fullName), esc(r.phone), esc(r.debtTotal), esc(r.text)].join(",")
    );
    const csv = "\uFEFF" + header + "\n" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "mailing-list.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-6">
      {/* Templates Section */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Шаблоны сообщений</h2>
          <button
            type="button"
            onClick={handleCreateTemplate}
            className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41]"
          >
            + Создать шаблон
          </button>
        </div>

        {loading && templates.length === 0 ? (
          <div className="mt-4 text-center text-sm text-zinc-600">Загрузка...</div>
        ) : (
          <div className="mt-4 space-y-3">
            {templates.map((template) => {
              const variables = extractVariables(template.message);
              return (
                <div key={template.id} className="rounded-lg border border-zinc-200 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-zinc-900">{template.title}</h3>
                        <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                          {CHANNEL_LABEL[(template as { channel?: string }).channel || "sms"] || "SMS"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-zinc-600 whitespace-pre-wrap">{template.message}</p>
                      {variables.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {variables.map((v) => (
                            <span key={v} className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700">
                              {`{${v}}`}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="mt-2 text-xs text-zinc-500">
                        Создан: {new Date(template.createdAt).toLocaleDateString("ru-RU")}
                      </p>
                    </div>
                    <div className="ml-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handlePreview(template)}
                        className="text-[#5E704F] hover:underline text-sm"
                      >
                        Предпросмотр
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditTemplate(template)}
                        className="text-[#5E704F] hover:underline text-sm"
                      >
                        Редактировать
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="text-red-600 hover:underline text-sm"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {templates.length === 0 && (
              <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-600">
                Нет шаблонов. Создайте первый шаблон.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Список рассылки */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Список рассылки (по должникам)</h2>
        <p className="mt-1 text-sm text-zinc-600">Выберите период и шаблон, нажмите «Сформировать». Экспорт в CSV. Реальной отправки нет.</p>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-zinc-700">Период</span>
            <select
              value={mailingPeriodId}
              onChange={(e) => setMailingPeriodId(e.target.value)}
              className="rounded border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>{p.from} — {p.to} {p.title ? `(${p.title})` : ""}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-zinc-700">Шаблон</span>
            <select
              value={mailingTemplateId}
              onChange={(e) => setMailingTemplateId(e.target.value)}
              className="rounded border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={handleGenerateMailing}
            disabled={generating || !mailingTemplateId}
            className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4d5d41] disabled:bg-zinc-300 disabled:cursor-not-allowed"
          >
            {generating ? "…" : "Сформировать список рассылки"}
          </button>
          {mailingRows.length > 0 && (
            <button
              type="button"
              onClick={handleExportMailingCsv}
              className="rounded border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            >
              Экспорт CSV
            </button>
          )}
        </div>
        {mailingRows.length === 0 && (
          <div className="mt-4 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-600">
            Список не сформирован. Выберите шаблон и нажмите «Сформировать список рассылки».
          </div>
        )}
        {mailingRows.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">ФИО</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">телефон</th>
                  <th className="px-3 py-2 text-right font-semibold text-zinc-700">долг</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">текст сообщения</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {mailingRows.map((r, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-zinc-800">{r.fullName}</td>
                    <td className="px-3 py-2 text-zinc-700">{r.phone}</td>
                    <td className="px-3 py-2 text-right text-zinc-800">{r.debtTotal.toLocaleString("ru-RU", { minimumFractionDigits: 2 })}</td>
                    <td className="max-w-md px-3 py-2 text-zinc-600 whitespace-pre-wrap">{r.text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Send Logs */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Журнал отправки</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700">Дата</th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700">Участок</th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700">Канал</th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700">Статус</th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700">Сообщение</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {logs.slice(0, 50).map((log) => (
                <tr key={log.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 text-zinc-600">{new Date(log.sentAt).toLocaleString("ru-RU")}</td>
                  <td className="px-4 py-3 text-zinc-600">{log.plotId}</td>
                  <td className="px-4 py-3 text-zinc-600">{log.channel}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded px-2 py-1 text-xs font-medium ${
                        log.status === "sent"
                          ? "bg-green-100 text-green-800"
                          : log.status === "simulated"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {log.status === "sent" ? "Отправлено" : log.status === "simulated" ? "Симуляция" : "Ошибка"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 max-w-md truncate">{log.message}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                    Отправок не найдено
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(message || error) && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            error ? "border-red-200 bg-red-50 text-red-900" : "border-green-200 bg-green-50 text-green-900"
          }`}
          role="alert"
        >
          {message && <span>{message}</span>}
          {error && <span>{error}</span>}
        </div>
      )}

      <TemplateDialog
        open={templateDialogOpen}
        onClose={() => {
          setTemplateDialogOpen(false);
          setEditingTemplate(null);
        }}
        onSave={handleSaveTemplate}
        editingTemplate={editingTemplate}
      />

      {selectedTemplate && (
        <PreviewDialog
          open={previewDialogOpen}
          onClose={() => {
            setPreviewDialogOpen(false);
            setSelectedTemplate(null);
          }}
          template={selectedTemplate}
          plotIds={Array.from(selectedPlotIds)}
          onSend={handleSend}
        />
      )}
    </div>
  );
}
