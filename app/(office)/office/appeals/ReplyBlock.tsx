"use client";

import { useState } from "react";
import { generateReply, type ReplyCategory, type ReplyTone } from "@/lib/office/replyTemplates";

type Props = {
  appealId: string;
  appealTitle: string;
  appealCreatedAt: string;
  plotNumber?: string;
  authorName?: string;
  replyDraft?: { text: string; category: string; tone: string; updatedAt: string };
  allowTelegram?: boolean;
  onSend?: (text: string, channel: "site" | "telegram") => Promise<void> | void;
};

export function ReplyBlock({
  appealId,
  appealTitle,
  appealCreatedAt,
  plotNumber,
  authorName,
  replyDraft,
  allowTelegram = false,
  onSend,
}: Props) {
  const [category, setCategory] = useState<ReplyCategory>((replyDraft?.category as ReplyCategory) ?? "other");
  const [tone, setTone] = useState<ReplyTone>((replyDraft?.tone as ReplyTone) ?? "short");
  const [text, setText] = useState<string>(replyDraft?.text ?? "");
  const [status, setStatus] = useState<string>("");
  const [channel, setChannel] = useState<"site" | "telegram">("site");

  const generate = () => {
    const ctx = {
      appealId,
      createdAt: new Date(appealCreatedAt).toLocaleDateString("ru-RU"),
      subject: appealTitle,
      plotNumber: plotNumber ?? "",
      street: plotNumber ?? "",
      authorName: authorName ?? "",
      siteName: "СНТ «Улыбка»",
    };
    setText(generateReply({ category, tone, ctx }));
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // noop
    }
  };

  const saveDraft = async () => {
    setStatus("");
    const res = await fetch("/api/office/appeals/save-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: appealId, text, category, tone }),
    });
    if (res.ok) {
      setStatus("Черновик сохранён");
    } else {
      setStatus("Не удалось сохранить");
    }
  };

  return (
    <div className="mt-6 space-y-3 rounded-xl border border-zinc-200 bg-white p-4" data-testid="office-appeal-reply-block">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-900">Ответ</h2>
        <span className="text-xs text-zinc-500">
          {replyDraft?.updatedAt ? `Черновик от ${new Date(replyDraft.updatedAt).toLocaleString("ru-RU")}` : ""}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm text-zinc-800">
          Категория
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ReplyCategory)}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:border-[#5E704F] focus:outline-none"
          >
            <option value="water">Водоснабжение</option>
            <option value="electricity">Электроэнергия</option>
            <option value="roads">Дороги/территория</option>
            <option value="fees">Взносы/начисления</option>
            <option value="documents">Документы</option>
            <option value="other">Другое</option>
          </select>
        </label>
        <label className="text-sm text-zinc-800">
          Тон
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as ReplyTone)}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:border-[#5E704F] focus:outline-none"
          >
            <option value="short">Кратко</option>
            <option value="official">Официально</option>
          </select>
        </label>
        <div className="flex items-end gap-2 sm:justify-end">
          <button
            type="button"
            onClick={generate}
            className="inline-flex items-center justify-center rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4d5d41]"
            data-testid="office-appeal-reply-generate"
          >
            Сформировать ответ
          </button>
        </div>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 shadow-sm focus:border-[#5E704F] focus:outline-none"
        placeholder="Текст ответа"
        data-testid="office-appeal-reply-text"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center justify-center rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-[#5E704F]"
          data-testid="office-appeal-reply-copy"
        >
          Скопировать
        </button>
        <button
          type="button"
          onClick={saveDraft}
          className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800"
          data-testid="office-appeal-reply-save"
        >
          Сохранить черновик
        </button>
        {allowTelegram ? (
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={channel === "telegram"}
              onChange={(e) => setChannel(e.target.checked ? "telegram" : "site")}
              className="h-4 w-4 rounded border-zinc-300 text-[#5E704F] focus:ring-[#5E704F]"
              data-testid="office-appeal-reply-send-telegram"
            />
            Отправить в Telegram
          </label>
        ) : null}
        {onSend ? (
          <button
            type="button"
            onClick={async () => {
              setStatus("");
              await onSend(text, channel);
              setStatus("Ответ отправлен");
            }}
            className="inline-flex items-center justify-center rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4d5d41]"
            data-testid="office-appeal-reply-send"
          >
            Отправить жителю
          </button>
        ) : null}
        {status ? <span className="text-xs text-zinc-500">{status}</span> : null}
      </div>
    </div>
  );
}
