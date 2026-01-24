"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ApiError, apiPost } from "@/lib/api/client";

type TemplateCard = {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  filledText: string;
};

const PREFILL_KEY = "prefillAppealText";

export default function TemplateListClient({ templates }: { templates: TemplateCard[] }) {
  const router = useRouter();
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);
  const [modalSlug, setModalSlug] = useState<string | null>(null);
  const [modalTopic, setModalTopic] = useState("Общее");
  const [modalText, setModalText] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSending, setModalSending] = useState(false);
  const [modalSuccess, setModalSuccess] = useState(false);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore copy errors silently
    }
  };

  const handleCreateAppeal = (text: string) => {
    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(PREFILL_KEY, text);
      }
    } catch {
      // ignore
    }
    router.push("/cabinet/appeals/new?prefill=session");
  };

  const handleDownload = async (tpl: TemplateCard) => {
    setLoadingSlug(tpl.slug);
    try {
      // raw endpoint (pdf blob)
      const res = await fetch("/api/documents/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: tpl.filledText, title: tpl.title }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${tpl.title} - ${new Intl.DateTimeFormat("ru-RU").format(new Date())}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      // ignore download errors silently
    } finally {
      setLoadingSlug(null);
    }
  };

  const openModal = (tpl: TemplateCard) => {
    setModalSlug(tpl.slug);
    setModalTopic("Общее");
    setModalText(tpl.filledText);
    setModalError(null);
  };

  const closeModal = () => {
    setModalSlug(null);
    setModalError(null);
    setModalSending(false);
    setModalSuccess(false);
  };

  const handleSend = async () => {
    if (!modalText || modalText.trim().length < 10) {
      setModalError("Сообщение должно быть не короче 10 символов.");
      return;
    }
    if (modalText.length > 4000) {
      setModalError("Сообщение слишком длинное (максимум 4000 символов).");
      return;
    }
    setModalError(null);
    setModalSending(true);
    try {
      await apiPost<{ appeal: { id: string } }>("/api/appeals", {
        topic: modalTopic || "Общее",
        message: modalText,
      });
      setModalSuccess(true);
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        setModalError("Слишком много обращений. Попробуйте позже.");
        return;
      }
      setModalError(error instanceof Error ? error.message : "Не удалось отправить обращение. Попробуйте позже.");
    } finally {
      setModalSending(false);
    }
  };

  const renderTags = (tags: string[]) => {
    if (!tags.length) return null;
    return (
      <div className="flex flex-wrap gap-2 text-[11px] text-zinc-500">
        {tags.map((tag) => (
          <span key={tag} className="rounded-full border border-zinc-200 px-2 py-0.5">
            {tag}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {templates.map((tpl) => (
        <div
          key={tpl.slug}
          className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-[#5E704F]/50 hover:shadow-md"
        >
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-zinc-900">{tpl.title}</h2>
            <p className="text-sm text-zinc-600">{tpl.description}</p>
            {renderTags(tpl.tags)}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleCopy(tpl.filledText)}
              className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:border-[#5E704F] hover:text-[#5E704F]"
            >
              Скопировать текст
            </button>
            <button
              type="button"
              onClick={() => handleCreateAppeal(tpl.filledText)}
              className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4b5b40]"
            >
              Создать обращение
            </button>
            <button
              type="button"
              onClick={() => handleDownload(tpl)}
              disabled={loadingSlug === tpl.slug}
              className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:border-[#5E704F] hover:text-[#5E704F] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingSlug === tpl.slug ? "Скачиваем..." : "Скачать PDF"}
            </button>
            <button
              type="button"
              onClick={() => openModal(tpl)}
              className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:border-[#5E704F] hover:text-[#5E704F]"
            >
              Отправить в правление
            </button>
          </div>
        </div>
      ))}

      {modalSlug ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-6">
          <div className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900">Отправить обращение</h3>
                <p className="text-sm text-zinc-600">Это будет отправлено как обращение в правление.</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full border border-zinc-200 px-3 py-1 text-sm text-zinc-600 hover:border-[#5E704F] hover:text-[#5E704F]"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <label className="block text-sm font-semibold text-zinc-800">
                Тема (необязательно)
                <input
                  type="text"
                  value={modalTopic}
                  onChange={(e) => setModalTopic(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                  placeholder="Общее"
                />
              </label>
              <label className="block text-sm font-semibold text-zinc-800">
                Текст обращения
                <textarea
                  value={modalText}
                  onChange={(e) => setModalText(e.target.value)}
                  rows={8}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                  minLength={10}
                  maxLength={4000}
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Минимум 10 символов, максимум 4000. Плейсхолдеры уже подставлены.
                </p>
              </label>
              {modalError ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {modalError}
                </div>
              ) : null}
              {modalSuccess ? (
                <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                  Отправлено. Перейдите в обращения, чтобы увидеть статус.
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {!modalSuccess ? (
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={modalSending}
                    className="rounded-full bg-[#5E704F] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4b5b40] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {modalSending ? "Отправляем..." : "Отправить"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => router.push("/cabinet/appeals")}
                    className="rounded-full bg-[#5E704F] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4b5b40]"
                  >
                    Перейти к обращениям
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-800 hover:border-[#5E704F] hover:text-[#5E704F]"
                >
                  Отменить
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
