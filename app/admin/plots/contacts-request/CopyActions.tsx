"use client";

import { useState } from "react";
import { Plot } from "@/types/snt";

const templateText = `Уважаемые собственники СНТ «Улыбка» (г. Снежинск)!
Для актуализации реестра просим сообщить контактные данные:
Улица, участок, ФИО, телефон, email.
Ответ можно отправить в Telegram/VK или через форму на сайте: /cabinet/tickets.
Спасибо.`;

export default function CopyActions({ rows }: { rows: Plot[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (text: string) => {
    if (!navigator?.clipboard) return;
    await navigator.clipboard.writeText(text);
    setCopied("Скопировано");
    setTimeout(() => setCopied(null), 1500);
  };

  const listText = rows
    .map((p) => `${p.street} — ${p.number} — ${p.ownerFullName ?? "без ФИО"}`)
    .join("\n");

  const downloadCsv = () => {
    const header = ["улица", "участок", "фио", "телефон", "почта", "статус", "подтвержден"];
    const lines = rows.map((p) =>
      [
        p.street ?? "",
        p.number ?? "",
        p.ownerFullName ?? "",
        p.phone ?? "",
        p.email ?? "",
        p.membershipStatus ?? "",
        p.isConfirmed ? "1" : "0",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contacts_request.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="space-y-2">
        <label className="text-sm font-semibold text-zinc-800">Текст обращения</label>
        <textarea
          readOnly
          value={templateText}
          className="h-32 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => copy(templateText)}
          className="rounded-full bg-[#5E704F] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#4d5d41]"
        >
          Скопировать текст
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-zinc-800">Список участков</p>
          {copied && <span className="text-xs text-emerald-700">{copied}</span>}
        </div>
        <textarea
          readOnly
          value={listText}
          className="h-32 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => copy(listText)}
            className="rounded-full border border-[#5E704F] px-4 py-2 text-xs font-semibold text-[#5E704F] transition-colors hover:bg-[#5E704F]/10"
          >
            Скопировать список
          </button>
          <button
            type="button"
            onClick={downloadCsv}
            className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:border-zinc-400"
          >
            Скачать CSV
          </button>
        </div>
      </div>
    </div>
  );
}

