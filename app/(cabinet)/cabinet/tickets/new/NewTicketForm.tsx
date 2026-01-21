"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { useAppRouter } from "@/hooks/useAppRouter";
import { ApiError, apiPostRaw, readOk } from "@/lib/api/client";

export default function NewTicketForm() {
  const router = useAppRouter();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const data = await apiPostRaw<{ url?: string; error?: string }>("/api/uploads/tickets", formData);
      const url = data.url;
      if (!url) {
        setError(data.error || "Не удалось загрузить файл");
        return;
      }
      setAttachments((prev) => [...prev, url].slice(0, 3));
    } catch (error) {
      if (error instanceof ApiError) {
        setError(error.message || "Не удалось загрузить файл");
        return;
      }
      setError("Ошибка загрузки файла");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (subject.trim().length < 3 || message.trim().length < 10) {
      setError("Тема от 3 символов, текст от 10 символов.");
      return;
    }
    if (attachments.length > 3) {
      setError("Можно прикрепить не более 3 изображений.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message, attachments }),
      });
      await readOk<{ ticketId?: string }>(res);
      router.replace("/cabinet/tickets");
      router.refresh();
    } catch {
      setError("Ошибка сети, попробуйте позже");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4"
    >
      <div className="space-y-2">
        <label className="text-sm font-semibold text-zinc-800">Тема обращения</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Коротко о проблеме"
          className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none transition-shadow focus:border-[#5E704F] focus:ring-2 focus:ring-[#5E704F]/30"
          maxLength={120}
          required
        />
        <p className="text-xs text-zinc-600">От 3 до 120 символов.</p>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-zinc-800">Текст обращения</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Опишите ситуацию подробно"
          className="h-40 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none transition-shadow focus:border-[#5E704F] focus:ring-2 focus:ring-[#5E704F]/30"
          maxLength={2000}
          required
        />
        <p className="text-xs text-zinc-600">От 10 до 2000 символов.</p>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-zinc-800">Фото (до 3)</label>
        <div className="flex flex-wrap gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:border-zinc-400">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  void handleUpload(file);
                  e.target.value = "";
                }
              }}
              disabled={attachments.length >= 3 || uploading}
            />
            {uploading ? "Загрузка..." : "Добавить фото"}
          </label>
          {attachments.map((url, idx) => (
            <div key={url} className="relative">
              <Image
                src={url}
                alt={`Вложение ${idx + 1}`}
                width={80}
                height={80}
                className="h-20 w-20 rounded-xl border border-zinc-200 object-cover"
              />
              <button
                type="button"
                onClick={() => setAttachments((prev) => prev.filter((item) => item !== url))}
                className="absolute -right-2 -top-2 rounded-full bg-white p-1 text-xs font-bold text-zinc-700 shadow"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-zinc-600">JPEG/PNG/WebP, до 5 МБ, не более 3 файлов.</p>
      </div>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-[#5E704F] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Отправляем..." : "Отправить"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:border-zinc-400"
        >
          Отмена
        </button>
      </div>
    </form>
  );
}
