"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type {
  PublicContent,
  PublicContentFaqItem,
  PublicDocumentCategory,
} from "@/lib/publicContentDefaults";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useAdminDirty } from "../AdminDirtyProvider";
import { useDirtyBeforeUnload } from "@/hooks/useDirtyBeforeUnload";

type SaveResult = { ok: boolean; reason?: string };
type ResetResult = { ok: boolean; reason?: string; content: PublicContent };

type PublicContentEditorProps = {
  initialContent: PublicContent;
  canSave: boolean;
  onSave: (next: PublicContent) => Promise<SaveResult>;
  onReset: () => Promise<ResetResult>;
};

type DraftPayload = {
  content: PublicContent;
  savedAt: number;
};

const DRAFT_KEY = "publicContentDraft:v1";

const createFaqItem = (): PublicContentFaqItem => ({
  question: "",
  answer: "",
});

const createDocumentItem = () => ({
  id: `doc-${Date.now()}`,
  title: "",
  date: "",
  description: "",
  downloadUrl: "",
});

export default function PublicContentEditor({
  initialContent,
  canSave,
  onSave,
  onReset,
}: PublicContentEditorProps) {
  const [content, setContent] = useState<PublicContent>(initialContent);
  const [status, setStatus] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"success" | "error" | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [draftFound, setDraftFound] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const [draftApplied, setDraftApplied] = useState(false);
  const [draftDiffersFromServer, setDraftDiffersFromServer] = useState(false);
  const [draftCalloutOpen, setDraftCalloutOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const confirmActionRef = useRef<(() => void) | null>(null);
  const draftTimerRef = useRef<number | null>(null);
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description?: string;
    confirmText?: string;
    destructive?: boolean;
  }>({ open: false, title: "" });
  const { setDirty: setDirtyGlobal } = useAdminDirty();
  const isDev = process.env.NODE_ENV !== "production";
  const initialSerialized = useMemo(() => JSON.stringify(initialContent), [initialContent]);
  const initialContentRef = useRef(initialContent);

  const setDirty = (value: boolean) => {
    setIsDirty(value);
    setDirtyGlobal(value);
  };

  const updateContacts = (field: keyof PublicContent["contacts"], value: string) => {
    setContent((prev) => ({
      ...prev,
      contacts: { ...prev.contacts, [field]: value },
    }));
    setDirty(true);
  };

  const updatePayment = (field: keyof PublicContent["paymentDetails"], value: string) => {
    setContent((prev) => ({
      ...prev,
      paymentDetails: { ...prev.paymentDetails, [field]: value },
    }));
    setDirty(true);
  };

  const updateAccessStep = (index: number, value: string) => {
    setContent((prev) => {
      const next = [...prev.accessSteps];
      next[index] = value;
      return { ...prev, accessSteps: next };
    });
    setDirty(true);
  };

  const updateFaqItem = (index: number, field: keyof PublicContentFaqItem, value: string) => {
    setContent((prev) => {
      const next = [...prev.faq];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, faq: next };
    });
    setDirty(true);
  };

  const updateCategory = (index: number, value: Partial<PublicDocumentCategory>) => {
    setContent((prev) => {
      const next = [...prev.documentsByCategory];
      next[index] = { ...next[index], ...value };
      return { ...prev, documentsByCategory: next };
    });
    setDirty(true);
  };

  const updateDocument = (
    categoryIndex: number,
    docIndex: number,
    field: keyof PublicDocumentCategory["documents"][number],
    value: string
  ) => {
    setContent((prev) => {
      const categories = [...prev.documentsByCategory];
      const category = categories[categoryIndex];
      const docs = [...category.documents];
      docs[docIndex] = { ...docs[docIndex], [field]: value };
      categories[categoryIndex] = { ...category, documents: docs };
      return { ...prev, documentsByCategory: categories };
    });
    setDirty(true);
  };

  const handleSave = () => {
    setStatus(null);
    setStatusTone(null);
    startTransition(async () => {
      const result = await onSave(content);
      if (result.ok) {
        setStatus("✓ Сохранено");
        setStatusTone("success");
        setDirty(false);
        clearDraft();
        window.setTimeout(() => {
          setStatus((prev) => (prev === "✓ Сохранено" ? null : prev));
          setStatusTone((prev) => (prev === "success" ? null : prev));
        }, 3500);
      } else {
        setStatus(result.reason ? `Не удалось сохранить: ${result.reason}` : "Не удалось сохранить");
        setStatusTone("error");
      }
    });
  };

  const handleReset = () => {
    setStatus(null);
    setStatusTone(null);
    startTransition(async () => {
      const result = await onReset();
      setContent(result.content);
      if (result.ok) {
        setStatus("Сброшено к дефолту");
        setStatusTone("success");
        setDirty(false);
        clearDraft();
        window.setTimeout(() => {
          setStatus((prev) => (prev === "Сброшено к дефолту" ? null : prev));
          setStatusTone((prev) => (prev === "success" ? null : prev));
        }, 3500);
      } else {
        setStatus(result.reason ? `Не удалось сбросить: ${result.reason}` : "Не удалось сбросить");
        setStatusTone("error");
      }
    });
  };

  const openConfirm = (
    config: { title: string; description?: string; confirmText?: string; destructive?: boolean },
    onConfirm: () => void
  ) => {
    confirmActionRef.current = onConfirm;
    setConfirmState({ open: true, ...config });
  };

  const handleConfirm = () => {
    const action = confirmActionRef.current;
    confirmActionRef.current = null;
    setConfirmState((prev) => ({ ...prev, open: false }));
    action?.();
  };

  const handleCancel = () => {
    confirmActionRef.current = null;
    setConfirmState((prev) => ({ ...prev, open: false }));
  };

  const clearDraft = () => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(DRAFT_KEY);
    setDraftFound(false);
    setDraftSavedAt(null);
    setDraftApplied(false);
    setDraftDiffersFromServer(false);
    setDraftCalloutOpen(false);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as DraftPayload;
      const differs = JSON.stringify(parsed.content) !== initialSerialized;
      setDraftFound(true);
      setDraftSavedAt(parsed.savedAt);
      setDraftDiffersFromServer(differs);
      setDraftCalloutOpen(true);
      if (differs) {
        setContent(parsed.content);
        setDirty(true);
        setDraftApplied(true);
      }
    } catch {
      window.localStorage.removeItem(DRAFT_KEY);
    }
  }, [initialSerialized]);

  useDirtyBeforeUnload(isDirty);

  useEffect(() => {
    return () => {
      setDirty(false);
    };
  }, []);

  useEffect(() => {
    if (!isDirty) return;
    if (draftTimerRef.current) {
      window.clearTimeout(draftTimerRef.current);
    }
    draftTimerRef.current = window.setTimeout(() => {
      try {
        const payload: DraftPayload = { content, savedAt: Date.now() };
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
        setDraftFound(true);
      } catch {
        // ignore storage errors
      }
    }, 400);
    return () => {
      if (draftTimerRef.current) {
        window.clearTimeout(draftTimerRef.current);
      }
    };
  }, [content, isDirty]);

  return (
    <div className="space-y-6">
      {draftFound && (draftApplied || draftDiffersFromServer || isDirty) && draftCalloutOpen ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="font-semibold">Черновик восстановлен</div>
          <div className="mt-1 text-xs text-amber-800">
            Мы восстановили несохранённые изменения от{" "}
            {draftSavedAt ? new Date(draftSavedAt).toLocaleString("ru-RU") : "—"}.
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setDraftCalloutOpen(false)}
              className="rounded-full bg-[#5E704F] px-4 py-1.5 text-xs font-semibold text-white"
            >
              Оставить
            </button>
            <button
              type="button"
              onClick={() => {
                setContent(initialContentRef.current);
                setDirty(false);
                setDraftCalloutOpen(false);
                setDraftApplied(false);
              }}
              className="rounded-full border border-amber-300 px-4 py-1.5 text-xs font-semibold text-amber-900"
            >
              Откатить
            </button>
            <button
              type="button"
              onClick={clearDraft}
              className="rounded-full border border-amber-300 px-4 py-1.5 text-xs font-semibold text-amber-900"
            >
              Удалить черновик
            </button>
          </div>
        </section>
      ) : null}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Контакты</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-zinc-800">Телефон</span>
            <input
              value={content.contacts.phone}
              onChange={(event) => updateContacts("phone", event.target.value)}
              className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-zinc-800">Почта</span>
            <input
              value={content.contacts.email}
              onChange={(event) => updateContacts("email", event.target.value)}
              className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-zinc-800">Telegram</span>
            <input
              value={content.contacts.telegram}
              onChange={(event) => updateContacts("telegram", event.target.value)}
              className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-zinc-800">VK</span>
            <input
              value={content.contacts.vk}
              onChange={(event) => updateContacts("vk", event.target.value)}
              className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Реквизиты</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-zinc-800">Получатель</span>
            <input
              value={content.paymentDetails.receiver}
              onChange={(event) => updatePayment("receiver", event.target.value)}
              className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-zinc-800">ИНН</span>
            <input
              value={content.paymentDetails.inn}
              onChange={(event) => updatePayment("inn", event.target.value)}
              className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-zinc-800">КПП</span>
            <input
              value={content.paymentDetails.kpp}
              onChange={(event) => updatePayment("kpp", event.target.value)}
              className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-zinc-800">Р/с</span>
            <input
              value={content.paymentDetails.account}
              onChange={(event) => updatePayment("account", event.target.value)}
              className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-zinc-800">Банк</span>
            <input
              value={content.paymentDetails.bank}
              onChange={(event) => updatePayment("bank", event.target.value)}
              className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-zinc-800">БИК</span>
            <input
              value={content.paymentDetails.bic}
              onChange={(event) => updatePayment("bic", event.target.value)}
              className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-zinc-800">Корр. счёт</span>
            <input
              value={content.paymentDetails.corr}
              onChange={(event) => updatePayment("corr", event.target.value)}
              className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Как получить доступ</h2>
          <button
            type="button"
            onClick={() =>
              setContent((prev) => ({
                ...prev,
                accessSteps: [...prev.accessSteps, ""],
              }))
            }
            onClickCapture={() => setDirty(true)}
            className="text-xs font-semibold text-[#5E704F] underline"
          >
            Добавить шаг
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {content.accessSteps.map((step, index) => (
            <div key={`step-${index}`} className="flex items-center gap-3">
              <input
                value={step}
                onChange={(event) => updateAccessStep(index, event.target.value)}
                className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm"
              />
              {content.accessSteps.length > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    openConfirm(
                      { title: "Удалить шаг доступа?", confirmText: "Удалить", destructive: true },
                      () => {
                        setContent((prev) => ({
                          ...prev,
                          accessSteps: prev.accessSteps.filter((_, i) => i !== index),
                        }));
                        setDirty(true);
                      }
                    )
                  }
                  className="text-xs font-semibold text-rose-600"
                >
                  Удалить
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">FAQ</h2>
          <button
            type="button"
            onClick={() =>
              setContent((prev) => ({
                ...prev,
                faq: [...prev.faq, createFaqItem()],
              }))
            }
            onClickCapture={() => setDirty(true)}
            className="text-xs font-semibold text-[#5E704F] underline"
          >
            Добавить вопрос
          </button>
        </div>
        <div className="mt-4 space-y-4">
          {content.faq.map((item, index) => (
            <div key={`faq-${index}`} className="rounded-2xl border border-zinc-200 p-4">
              <label className="block text-sm font-medium text-zinc-800">Вопрос</label>
              <input
                value={item.question}
                onChange={(event) => updateFaqItem(index, "question", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm"
              />
              <label className="mt-4 block text-sm font-medium text-zinc-800">Ответ</label>
              <textarea
                value={item.answer}
                onChange={(event) => updateFaqItem(index, "answer", event.target.value)}
                rows={3}
                className="mt-2 w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm"
              />
              {content.faq.length > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    openConfirm(
                      {
                        title: "Удалить вопрос?",
                        description: item.question
                          ? `Вопрос: "${item.question.slice(0, 80)}${item.question.length > 80 ? "…" : ""}"`
                          : undefined,
                        confirmText: "Удалить",
                        destructive: true,
                      },
                      () => {
                        setContent((prev) => ({
                          ...prev,
                          faq: prev.faq.filter((_, i) => i !== index),
                        }));
                        setDirty(true);
                      }
                    )
                  }
                  className="mt-3 text-xs font-semibold text-rose-600"
                >
                  Удалить вопрос
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Документы</h2>
        <div className="mt-4 space-y-6">
          {content.documentsByCategory.map((category, categoryIndex) => (
            <div key={category.key} className="space-y-3 rounded-2xl border border-zinc-200 p-4">
              <label className="block text-sm font-medium text-zinc-800">Категория</label>
              <input
                value={category.label}
                onChange={(event) => updateCategory(categoryIndex, { label: event.target.value })}
                className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm"
              />
              <div className="space-y-3">
                {category.documents.map((doc, docIndex) => (
                  <div key={doc.id} className="rounded-2xl border border-zinc-200 p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-zinc-800">Название</span>
                        <input
                          value={doc.title}
                          onChange={(event) =>
                            updateDocument(categoryIndex, docIndex, "title", event.target.value)
                          }
                          className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-zinc-800">Дата</span>
                        <input
                          value={doc.date}
                          onChange={(event) =>
                            updateDocument(categoryIndex, docIndex, "date", event.target.value)
                          }
                          className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="space-y-1 text-sm md:col-span-2">
                        <span className="font-medium text-zinc-800">Описание</span>
                        <textarea
                          value={doc.description}
                          onChange={(event) =>
                            updateDocument(
                              categoryIndex,
                              docIndex,
                              "description",
                              event.target.value
                            )
                          }
                          rows={2}
                          className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="space-y-1 text-sm md:col-span-2">
                        <span className="font-medium text-zinc-800">Ссылка на файл</span>
                        <input
                          value={doc.downloadUrl}
                          onChange={(event) =>
                            updateDocument(
                              categoryIndex,
                              docIndex,
                              "downloadUrl",
                              event.target.value
                            )
                          }
                          className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm"
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        openConfirm(
                          { title: "Удалить документ?", confirmText: "Удалить", destructive: true },
                          () =>
                            updateCategory(categoryIndex, {
                              documents: category.documents.filter((_, i) => i !== docIndex),
                            })
                        )
                      }
                      className="mt-3 text-xs font-semibold text-rose-600"
                    >
                      Удалить документ
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  updateCategory(categoryIndex, {
                    documents: [...category.documents, createDocumentItem()],
                  })
                }
                onClickCapture={() => setDirty(true)}
                className="text-xs font-semibold text-[#5E704F] underline"
              >
                Добавить документ
              </button>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave || isPending}
          className="rounded-full bg-[#5E704F] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Сохранение…" : "Сохранить"}
        </button>
        {!canSave ? (
          <div className="text-xs text-amber-700">Сохранение недоступно в PROD</div>
        ) : null}
        {isDirty ? (
          <div className="text-xs font-semibold text-amber-700">
            Есть несохранённые изменения
          </div>
        ) : null}
        {isDev ? (
          <div className="text-xs text-zinc-500">
            beforeunload: {isDirty ? "armed" : "off"} · draft:{" "}
            {draftFound ? "present" : "none"} · applied:{" "}
            {draftApplied ? "true" : "false"} · diff:{" "}
            {draftDiffersFromServer ? "true" : "false"}
          </div>
        ) : null}
        {status ? (
          <div
            className={`text-sm ${
              statusTone === "success"
                ? "text-emerald-700"
                : statusTone === "error"
                  ? "text-rose-700"
                  : "text-zinc-600"
            }`}
          >
            {status}
          </div>
        ) : null}
      </div>

      <section className="rounded-2xl border border-rose-100 bg-rose-50/40 p-4">
        <div className="text-sm font-semibold text-rose-700">Опасные действия</div>
        <p className="mt-1 text-xs text-rose-700">
          Вернёт значения по умолчанию и удалит текущие изменения.
        </p>
        <button
          type="button"
          onClick={() =>
            openConfirm(
              {
                title: "Сбросить к дефолту?",
                description:
                  "Все несохранённые и сохранённые в DEV изменения будут потеряны. Продолжить?",
                confirmText: "Сбросить",
                destructive: true,
              },
              handleReset
            )
          }
          disabled={isPending}
          className="mt-3 rounded-full border border-rose-400 px-5 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Сбросить к дефолту
        </button>
      </section>

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        confirmText={confirmState.confirmText}
        destructive={confirmState.destructive}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
}
