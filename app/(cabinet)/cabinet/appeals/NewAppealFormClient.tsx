"use client";

import { useEffect, useState } from "react";

type Props = {
  action: (formData: FormData) => Promise<void>;
  prefill?: string;
  topics: string[];
};

const PREFILL_KEY = "prefillAppealText";
const LEGACY_KEY = "appeal.prefill.text";

export default function NewAppealFormClient({ action, prefill = "", topics }: Props) {
  const initial = (() => {
    if (prefill && prefill !== "session") return { msg: prefill, fromStorage: false };
    if (typeof window === "undefined") return { msg: "", fromStorage: false };
    try {
      const stored = window.sessionStorage.getItem(PREFILL_KEY) ??
        window.sessionStorage.getItem(LEGACY_KEY);
      if (stored) {
        return { msg: stored, fromStorage: true };
      }
    } catch {
      // ignore
    }
    return { msg: "", fromStorage: false };
  })();

  const [message, setMessage] = useState(initial.msg);
  const fromStorage = initial.fromStorage;
  const [topic, setTopic] = useState(topics[0] ?? "Общее");

  useEffect(() => {
    if (!fromStorage) return;
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.removeItem(PREFILL_KEY);
      window.sessionStorage.removeItem(LEGACY_KEY);
    } catch {
      // ignore
    }
  }, [fromStorage]);

  return (
    <form action={action} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <label className="block text-sm font-semibold text-zinc-800">
        Тема
        <select
          name="topic"
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          required
        >
          {topics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-semibold text-zinc-800">
        Сообщение
        <textarea
          name="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
          placeholder="Кратко опишите вопрос. Если есть срок или сумма — укажите."
          minLength={10}
          maxLength={4000}
          required
        />
        <p className="mt-1 text-xs text-zinc-500">Минимум 10 символов. Если поле пустое, отправка не произойдёт.</p>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="rounded-full bg-[#5E704F] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4b5b40]"
        >
          Отправить обращение
        </button>
        <p className="text-xs text-zinc-500">
          Ответ придёт в личный кабинет. Мы не публикуем обращения.
        </p>
      </div>
    </form>
  );
}
