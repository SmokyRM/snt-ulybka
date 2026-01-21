"use client";

import { useState, useEffect } from "react";
import type { MessageTemplate } from "@/lib/billing";

type Channel = "sms" | "email" | "whatsapp-draft";

interface TemplateDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { title: string; message: string; channel?: Channel }) => void;
  editingTemplate: MessageTemplate | null;
}

const CHANNELS: { value: Channel; label: string }[] = [
  { value: "sms", label: "SMS" },
  { value: "email", label: "Email" },
  { value: "whatsapp-draft", label: "WhatsApp (черновик)" },
];

export default function TemplateDialog({ open, onClose, onSave, editingTemplate }: TemplateDialogProps) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [channel, setChannel] = useState<Channel>("sms");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Reset form when dialog opens or editingTemplate changes.
    // Schedule setState in microtask to avoid react-hooks/set-state-in-effect (sync setState in effect).
    if (!open) return;
    const t = editingTemplate;
    const ch: Channel = t && ((t as { channel?: Channel }).channel === "email" || (t as { channel?: Channel }).channel === "whatsapp-draft") ? (t as { channel?: Channel }).channel! : "sms";
    queueMicrotask(() => {
      if (t) {
        setTitle(t.title);
        setMessage(t.message);
        setChannel(ch);
      } else {
        setTitle("");
        setMessage("");
        setChannel("sms");
      }
      setErrors({});
    });
  }, [open, editingTemplate]);

  if (!open) return null;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) {
      newErrors.title = "Название обязательно";
    }
    if (!message.trim()) {
      newErrors.message = "Сообщение обязательно";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({ title: title.trim(), message: message.trim() });
  };

  // Extract available variables
  const availableVariables = [
    { key: "plotNumber", label: "Номер участка" },
    { key: "ownerName", label: "ФИО владельца" },
    { key: "debtAmount", label: "Сумма долга" },
    { key: "periods", label: "Периоды задолженности" },
    { key: "street", label: "Улица" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-zinc-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-zinc-900">
            {editingTemplate ? "Редактировать шаблон" : "Создать шаблон"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="space-y-4">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-zinc-700">
                Название <span className="text-red-500">*</span>
              </span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например, Уведомление о долге"
                className={`w-full rounded border px-3 py-2 text-sm ${errors.title ? "border-red-300" : "border-zinc-300"}`}
              />
              {errors.title && <p className="text-xs text-red-600">{errors.title}</p>}
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-zinc-700">Канал</span>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as Channel)}
                className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              >
                {CHANNELS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-zinc-700">
                Сообщение <span className="text-red-500">*</span>
              </span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={8}
                placeholder="Введите текст сообщения. Используйте переменные: {plotNumber}, {ownerName}, {debtAmount}, {periods}, {street}"
                className={`w-full rounded border px-3 py-2 text-sm font-mono ${errors.message ? "border-red-300" : "border-zinc-300"}`}
              />
              {errors.message && <p className="text-xs text-red-600">{errors.message}</p>}
            </label>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
              <p className="font-medium text-blue-900">Доступные переменные:</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {availableVariables.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => setMessage((prev) => prev + `{${v.key}}`)}
                    className="rounded border border-blue-300 bg-white px-2 py-1 text-xs text-blue-700 hover:bg-blue-50"
                  >
                    {`{${v.key}}`} — {v.label}
                  </button>
                ))}
              </div>
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
              type="submit"
              className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41]"
            >
              {editingTemplate ? "Сохранить" : "Создать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}