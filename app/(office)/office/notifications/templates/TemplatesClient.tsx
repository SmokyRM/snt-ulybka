"use client";

import { useState, useTransition } from "react";
import { apiPost, ApiError } from "@/lib/api/client";

interface TemplateVariable {
  name: string;
  label: string;
  example?: string;
}

interface Template {
  id: string;
  name: string;
  channel: string;
  subject: string | null;
  body: string;
  variablesSchema: TemplateVariable[];
  isActive: boolean;
  createdAt: string;
}

interface Props {
  initialTemplates: Template[];
  canManage: boolean;
}

const CHANNELS = [
  { value: "telegram", label: "Telegram" },
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "print", label: "Печать" },
];

const DEFAULT_VARS: TemplateVariable[] = [
  { name: "fullName", label: "ФИО", example: "Иванов И.И." },
  { name: "plotNumber", label: "Номер участка", example: "42" },
  { name: "debtAmount", label: "Сумма долга", example: "15000" },
  { name: "period", label: "Период", example: "2026-01" },
  { name: "payLink", label: "Ссылка оплаты", example: "https://pay.example.com" },
];

export default function TemplatesClient({ initialTemplates, canManage }: Props) {
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("telegram");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState<{ subject?: string; body: string } | null>(null);
  const [previewVars, setPreviewVars] = useState<Record<string, string>>({});
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setChannel("telegram");
    setSubject("");
    setBody("");
    setPreview(null);
    setPreviewVars({});
    setPreviewErrors([]);
    setEditId(null);
    setError(null);
  };

  const openEdit = (t: Template) => {
    setEditId(t.id);
    setName(t.name);
    setChannel(t.channel);
    setSubject(t.subject ?? "");
    setBody(t.body);
    setPreview(null);
    setPreviewVars(
      Object.fromEntries(t.variablesSchema.map((v) => [v.name, v.example ?? ""])),
    );
    setShowForm(true);
  };

  const doPreview = () => {
    startTransition(async () => {
      setError(null);
      try {
        const data = await apiPost<{ rendered: { subject?: string; body: string } | null; variables: string[]; errors: string[] }>(
          "/api/office/notifications/templates/manage",
          {
            mode: "preview",
            ...(editId ? { templateId: editId } : { subject: subject || null, body }),
            channel,
            vars: previewVars,
          },
        );
        setPreview(data.rendered);
        setPreviewErrors(data.errors ?? []);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Сетевая ошибка");
      }
    });
  };

  const doSave = () => {
    startTransition(async () => {
      setError(null);
      try {
        const payload = editId
          ? { mode: "update", id: editId, name, channel, subject: subject || null, body }
          : { mode: "create", name, channel, subject: subject || null, body };

        const data = await apiPost<{ template: Template }>(
          "/api/office/notifications/templates/manage",
          payload,
        );
        const saved = data.template;
        if (editId) {
          setTemplates((prev) => prev.map((t) => (t.id === editId ? saved : t)));
        } else {
          setTemplates((prev) => [saved, ...prev]);
        }
        resetForm();
        setShowForm(false);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Сетевая ошибка");
      }
    });
  };

  return (
    <div className="space-y-4">
      {canManage && (
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="rounded-full bg-[#5E704F] px-5 py-2 text-sm font-semibold text-white hover:bg-[#4d5d40]"
        >
          {showForm ? "Закрыть" : "Создать шаблон"}
        </button>
      )}

      {showForm && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">{editId ? "Редактировать" : "Новый шаблон"}</h2>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Название</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                placeholder="Уведомление о долге"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Канал</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              >
                {CHANNELS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {(channel === "email" || channel === "print") && (
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Тема (subject)</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                placeholder="Уведомление о задолженности"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Текст шаблона</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-mono"
              placeholder={"Уважаемый(ая) {{fullName}},\n\nВаш участок №{{plotNumber}}. Сумма задолженности: {{debtAmount}} руб."}
            />
            <p className="mt-1 text-xs text-zinc-500">
              Переменные: {DEFAULT_VARS.map((v) => `{{${v.name}}}`).join(", ")}
            </p>
          </div>

          <div className="border-t border-zinc-100 pt-3">
            <h3 className="mb-2 text-sm font-semibold text-zinc-700">Тестовые данные для превью</h3>
            <div className="grid gap-2 sm:grid-cols-3">
              {DEFAULT_VARS.map((v) => (
                <div key={v.name}>
                  <label className="text-xs text-zinc-500">{`{{${v.name}}}`} — {v.label}</label>
                  <input
                    value={previewVars[v.name] ?? v.example ?? ""}
                    onChange={(e) => setPreviewVars((prev) => ({ ...prev, [v.name]: e.target.value }))}
                    className="w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={doPreview}
              disabled={isPending || !body.trim()}
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-[#5E704F] disabled:opacity-50"
            >
              Превью
            </button>
            <button
              onClick={doSave}
              disabled={isPending || !name.trim() || !body.trim()}
              className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4d5d40] disabled:opacity-50"
            >
              {editId ? "Сохранить" : "Создать"}
            </button>
          </div>

          {previewErrors.length > 0 && (
            <div className="rounded-lg bg-amber-50 p-3">
              {previewErrors.map((e, i) => (
                <p key={i} className="text-sm text-amber-700">{e}</p>
              ))}
            </div>
          )}

          {preview && (
            <div className="rounded-lg bg-zinc-50 p-4 space-y-2">
              <h4 className="text-sm font-semibold text-zinc-700">Результат</h4>
              {preview.subject && (
                <p className="text-sm"><span className="font-medium">Тема:</span> {preview.subject}</p>
              )}
              <pre className="whitespace-pre-wrap text-sm text-zinc-800">{preview.body}</pre>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {templates.length === 0 ? (
          <p className="text-sm text-zinc-500">Шаблоны пока не созданы</p>
        ) : (
          templates.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-zinc-900">{t.name}</h3>
                  <div className="mt-1 flex gap-2">
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                      {t.channel}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      t.isActive ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"
                    }`}>
                      {t.isActive ? "Активен" : "Неактивен"}
                    </span>
                  </div>
                </div>
                {canManage && (
                  <button
                    onClick={() => openEdit(t)}
                    className="text-sm font-medium text-[#5E704F] hover:underline"
                  >
                    Редактировать
                  </button>
                )}
              </div>
              <pre className="mt-2 max-h-24 overflow-hidden whitespace-pre-wrap text-xs text-zinc-600">
                {t.body}
              </pre>
              {t.variablesSchema.length > 0 && (
                <p className="mt-2 text-xs text-zinc-400">
                  Переменные: {t.variablesSchema.map((v) => `{{${v.name}}}`).join(", ")}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
