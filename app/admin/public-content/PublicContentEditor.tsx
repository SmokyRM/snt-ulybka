"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import type { DragEvent } from "react";
import type {
  PublicContent,
  PublicContentFaqItem,
  PublicDocumentCategory,
} from "@/lib/publicContentDefaults";
import { PUBLIC_CONTENT_DEFAULTS } from "@/lib/publicContentDefaults";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useAdminDirty } from "../AdminDirtyProvider";

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

const normalizeDigits = (value: string) => value.replace(/\D/g, "");
const formatPhone = (value: string) => {
  const digits = normalizeDigits(value);
  if (!digits) return "";
  const normalized = digits.startsWith("8") ? `7${digits.slice(1)}` : digits;
  const body = normalized.slice(0, 11);
  const parts = [body.slice(1, 4), body.slice(4, 7), body.slice(7, 9), body.slice(9, 11)];
  let formatted = `+${body[0] ?? "7"}`;
  if (parts[0]) formatted += ` (${parts[0]}`;
  if (parts[0] && parts[0].length === 3) formatted += ")";
  if (parts[1]) formatted += ` ${parts[1]}`;
  if (parts[2]) formatted += `-${parts[2]}`;
  if (parts[3]) formatted += `-${parts[3]}`;
  return formatted;
};
const validatePhone = (value: string) => {
  const digits = normalizeDigits(value);
  if (!digits) return "Введите телефон";
  if (digits.length !== 11 || (digits[0] !== "7" && digits[0] !== "8")) {
    return "Телефон должен содержать 11 цифр и начинаться с 7 или 8";
  }
  return null;
};
const validateEmail = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "Введите email";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "Некорректный email";
  return null;
};
const validateUrl = (value: string, required = false) => {
  const trimmed = value.trim();
  if (!trimmed) return required ? "Укажите ссылку" : null;
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:")) {
    return "Недопустимый URL";
  }
  if (lower.startsWith("//") || lower.startsWith("http://")) {
    return "Разрешены только https:// или относительные ссылки";
  }
  if (lower.startsWith("https://") || lower.startsWith("/")) return null;
  if (lower.includes("://")) return "Разрешены только https:// или относительные ссылки";
  return "URL должен начинаться с https:// или /";
};
const validateInn = (value: string) => {
  const digits = normalizeDigits(value);
  if (!digits) return "Укажите ИНН";
  if (digits.length !== 10 && digits.length !== 12) return "ИНН должен быть 10 или 12 цифр";
  return null;
};
const validateKpp = (value: string) => {
  const digits = normalizeDigits(value);
  if (!digits) return "Укажите КПП";
  if (digits.length !== 9) return "КПП должен быть 9 цифр";
  return null;
};

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
  const hasInitialContent =
    Boolean(initialContent) &&
    Boolean(initialContent.contacts) &&
    Boolean(initialContent.paymentDetails) &&
    Array.isArray(initialContent.faq) &&
    Array.isArray(initialContent.documentsByCategory) &&
    Array.isArray(initialContent.accessSteps);
  const safeInitialContent = hasInitialContent ? initialContent : PUBLIC_CONTENT_DEFAULTS;
  const [state, setState] = useState<{ baseline: PublicContent; form: PublicContent }>({
    baseline: safeInitialContent,
    form: safeInitialContent,
  });
  const content = state.form;
  const baselineContent = state.baseline;
  const [status, setStatus] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"success" | "error" | null>(null);
  const formSerialized = useMemo(() => JSON.stringify(content), [content]);
  const baselineSerialized = useMemo(
    () => JSON.stringify(baselineContent),
    [baselineContent]
  );
  const isDirty = formSerialized !== baselineSerialized;
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [draftFound, setDraftFound] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const [draftDiffersFromServer, setDraftDiffersFromServer] = useState(false);
  const [draftPayload, setDraftPayload] = useState<DraftPayload | null>(null);
  const [draftCalloutOpen, setDraftCalloutOpen] = useState(false);
  const [rehydrationDetected, setRehydrationDetected] = useState(false);
  const [rehydrationLock, setRehydrationLock] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [gateMode, setGateMode] = useState<"unknown" | "baseline" | "draft">("unknown");
  const [bootState, setBootState] = useState<"checking" | "ready">("checking");
  const [formDomKey, setFormDomKey] = useState(() => Date.now().toString());
  const [previewOpen, setPreviewOpen] = useState(false);
  const [dragFaqIndex, setDragFaqIndex] = useState<number | null>(null);
  const [dragFaqOverIndex, setDragFaqOverIndex] = useState<number | null>(null);
  const [faqDropPosition, setFaqDropPosition] = useState<"above" | "below" | null>(null);
  const [dragDoc, setDragDoc] = useState<{ categoryIndex: number; index: number } | null>(null);
  const [dragDocOver, setDragDocOver] = useState<{ categoryIndex: number; index: number } | null>(
    null
  );
  const [docDropPosition, setDocDropPosition] = useState<"above" | "below" | null>(null);
  const [isPending, startTransition] = useTransition();
  const confirmActionRef = useRef<(() => void) | null>(null);
  const contentRef = useRef(content);
  const dirtyRef = useRef(isDirty);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const pendingNavigationRef = useRef<(() => void) | null>(null);
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
  const initialContentRef = useRef(safeInitialContent);
  const initialLoadedAtRef = useRef(Date.now());

  const leaveDiffs = useMemo(
    () => buildDiffList(content, baselineContent),
    [content, baselineContent]
  );

  useEffect(() => {
    initialContentRef.current = state.baseline;
  }, [state.baseline]);

  const reorderList = <T,>(items: T[], from: number, to: number) => {
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  };

  function buildDiffList(current: PublicContent, baseline: PublicContent) {
    const diffs: string[] = [];
    const formatValue = (value: string) => (value?.trim() ? value.trim() : "—");
    const addField = (label: string, prev: string, next: string) => {
      if (prev === next) return;
      diffs.push(`${label}: ${formatValue(prev)} → ${formatValue(next)}`);
    };

    addField("Контакты · Телефон", baseline.contacts.phone, current.contacts.phone);
    addField("Контакты · Email", baseline.contacts.email, current.contacts.email);
    addField("Контакты · Telegram", baseline.contacts.telegram, current.contacts.telegram);
    addField("Контакты · VK", baseline.contacts.vk, current.contacts.vk);

    addField("Реквизиты · Получатель", baseline.paymentDetails.receiver, current.paymentDetails.receiver);
    addField("Реквизиты · ИНН", baseline.paymentDetails.inn, current.paymentDetails.inn);
    addField("Реквизиты · КПП", baseline.paymentDetails.kpp, current.paymentDetails.kpp);
    addField("Реквизиты · Р/с", baseline.paymentDetails.account, current.paymentDetails.account);
    addField("Реквизиты · Банк", baseline.paymentDetails.bank, current.paymentDetails.bank);
    addField("Реквизиты · БИК", baseline.paymentDetails.bic, current.paymentDetails.bic);
    addField("Реквизиты · Корр. счёт", baseline.paymentDetails.corr, current.paymentDetails.corr);

    const currentFaqOrder = current.faq.map((item) => item.question);
    const baselineFaqOrder = baseline.faq.map((item) => item.question);
    const faqOrderChanged = JSON.stringify(currentFaqOrder) !== JSON.stringify(baselineFaqOrder);
    const faqContentChanged = JSON.stringify(current.faq) !== JSON.stringify(baseline.faq);
    if (faqOrderChanged) {
      diffs.push("Порядок FAQ изменён");
    } else if (faqContentChanged) {
      diffs.push("FAQ: изменены вопросы/ответы");
    }

    const currentDocOrder = current.documentsByCategory.flatMap((category) =>
      category.documents.map((doc) => doc.id)
    );
    const baselineDocOrder = baseline.documentsByCategory.flatMap((category) =>
      category.documents.map((doc) => doc.id)
    );
    const docOrderChanged =
      JSON.stringify(currentDocOrder) !== JSON.stringify(baselineDocOrder);
    if (docOrderChanged) {
      diffs.push("Порядок документов изменён");
    }

    current.documentsByCategory.forEach((category) => {
      const baselineCategory = baseline.documentsByCategory.find(
        (item) => item.key === category.key
      );
      category.documents.forEach((doc) => {
        const baselineDoc = baselineCategory?.documents.find((item) => item.id === doc.id);
        if (!baselineDoc) {
          diffs.push(`Документы: добавлен "${doc.title || doc.id}"`);
          return;
        }
        addField(
          `Документы · ${doc.title || doc.id} · Название`,
          baselineDoc.title,
          doc.title
        );
        addField(
          `Документы · ${doc.title || doc.id} · Дата`,
          baselineDoc.date,
          doc.date
        );
        addField(
          `Документы · ${doc.title || doc.id} · Описание`,
          baselineDoc.description,
          doc.description
        );
        addField(
          `Документы · ${doc.title || doc.id} · Ссылка`,
          baselineDoc.downloadUrl,
          doc.downloadUrl
        );
      });
    });

    return diffs;
  }

  const validationErrors = useMemo(() => {
    const contacts = {
      phone: validatePhone(content.contacts.phone),
      email: validateEmail(content.contacts.email),
      telegram: validateUrl(content.contacts.telegram, false),
      vk: validateUrl(content.contacts.vk, false),
    };
    const payment = {
      inn: validateInn(content.paymentDetails.inn),
      kpp: validateKpp(content.paymentDetails.kpp),
    };
    const documents: Record<string, string> = {};
    content.documentsByCategory.forEach((category) => {
      category.documents.forEach((doc) => {
        const err = validateUrl(doc.downloadUrl, true);
        if (err) documents[doc.id] = err;
      });
    });
    return { contacts, payment, documents };
  }, [content]);

  const hasErrors =
    Boolean(validationErrors.contacts.phone) ||
    Boolean(validationErrors.contacts.email) ||
    Boolean(validationErrors.contacts.telegram) ||
    Boolean(validationErrors.contacts.vk) ||
    Boolean(validationErrors.payment.inn) ||
    Boolean(validationErrors.payment.kpp) ||
    Object.keys(validationErrors.documents).length > 0;

  const setContent = (
    updater: PublicContent | ((prev: PublicContent) => PublicContent)
  ) => {
    setState((prev) => ({
      ...prev,
      form: typeof updater === "function" ? (updater as (prev: PublicContent) => PublicContent)(prev.form) : updater,
    }));
  };

  const updateContacts = (field: keyof PublicContent["contacts"], value: string) => {
    if (rehydrationLock) return;
    setContent((prev) => ({
      ...prev,
      contacts: { ...prev.contacts, [field]: value },
    }));
  };

  const updatePayment = (field: keyof PublicContent["paymentDetails"], value: string) => {
    if (rehydrationLock) return;
    setContent((prev) => ({
      ...prev,
      paymentDetails: { ...prev.paymentDetails, [field]: value },
    }));
  };

  const updateAccessStep = (index: number, value: string) => {
    if (rehydrationLock) return;
    setContent((prev) => {
      const next = [...prev.accessSteps];
      next[index] = value;
      return { ...prev, accessSteps: next };
    });
  };

  const updateFaqItem = (index: number, field: keyof PublicContentFaqItem, value: string) => {
    if (rehydrationLock) return;
    setContent((prev) => {
      const next = [...prev.faq];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, faq: next };
    });
  };

  const updateCategory = (index: number, value: Partial<PublicDocumentCategory>) => {
    if (rehydrationLock) return;
    setContent((prev) => {
      const next = [...prev.documentsByCategory];
      next[index] = { ...next[index], ...value };
      return { ...prev, documentsByCategory: next };
    });
  };

  const updateDocument = (
    categoryIndex: number,
    docIndex: number,
    field: keyof PublicDocumentCategory["documents"][number],
    value: string
  ) => {
    if (rehydrationLock) return;
    setContent((prev) => {
      const categories = [...prev.documentsByCategory];
      const category = categories[categoryIndex];
      const docs = [...category.documents];
      docs[docIndex] = { ...docs[docIndex], [field]: value };
      categories[categoryIndex] = { ...category, documents: docs };
      return { ...prev, documentsByCategory: categories };
    });
  };

  const handleFaqDragStart = (index: number, event: DragEvent) => {
    if (rehydrationLock) return;
    setDragFaqIndex(index);
    setDragFaqOverIndex(index);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
  };

  const handleFaqDragOver = (index: number, event: DragEvent) => {
    if (rehydrationLock) return;
    event.preventDefault();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const nextPosition =
      event.clientY < rect.top + rect.height / 2 ? "above" : "below";
    if (dragFaqOverIndex !== index) setDragFaqOverIndex(index);
    if (faqDropPosition !== nextPosition) setFaqDropPosition(nextPosition);
  };

  const handleFaqDrop = (index: number, event: DragEvent) => {
    if (rehydrationLock) return;
    event.preventDefault();
    if (dragFaqIndex === null) return;
    if (index !== dragFaqIndex) {
      setContent((prev) => ({ ...prev, faq: reorderList(prev.faq, dragFaqIndex, index) }));
    }
    setDragFaqIndex(null);
    setDragFaqOverIndex(null);
    setFaqDropPosition(null);
  };

  const handleFaqDragEnd = () => {
    if (rehydrationLock) return;
    setDragFaqIndex(null);
    setDragFaqOverIndex(null);
    setFaqDropPosition(null);
  };

  const handleDocDragStart = (
    categoryIndex: number,
    index: number,
    event: DragEvent
  ) => {
    if (rehydrationLock) return;
    setDragDoc({ categoryIndex, index });
    setDragDocOver({ categoryIndex, index });
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `${categoryIndex}:${index}`);
  };

  const handleDocDragOver = (
    categoryIndex: number,
    index: number,
    event: DragEvent
  ) => {
    if (rehydrationLock) return;
    if (!dragDoc || dragDoc.categoryIndex !== categoryIndex) return;
    event.preventDefault();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const nextPosition =
      event.clientY < rect.top + rect.height / 2 ? "above" : "below";
    if (!dragDocOver || dragDocOver.index !== index) {
      setDragDocOver({ categoryIndex, index });
    }
    if (docDropPosition !== nextPosition) setDocDropPosition(nextPosition);
  };

  const handleDocDrop = (categoryIndex: number, index: number, event: DragEvent) => {
    if (rehydrationLock) return;
    if (!dragDoc || dragDoc.categoryIndex !== categoryIndex) return;
    event.preventDefault();
    if (dragDoc.index !== index) {
      setContent((prev) => {
        const categories = [...prev.documentsByCategory];
        const category = categories[categoryIndex];
        const nextDocs = reorderList(category.documents, dragDoc.index, index);
        categories[categoryIndex] = { ...category, documents: nextDocs };
        return { ...prev, documentsByCategory: categories };
      });
    }
    setDragDoc(null);
    setDragDocOver(null);
    setDocDropPosition(null);
  };

  const handleDocDragEnd = () => {
    if (rehydrationLock) return;
    setDragDoc(null);
    setDragDocOver(null);
    setDocDropPosition(null);
  };

  const handleSave = () => {
    setStatus(null);
    setStatusTone(null);
    startTransition(async () => {
      const result = await onSave(content);
      if (result.ok) {
        setStatus("✓ Сохранено");
        setStatusTone("success");
        setLastSavedAt(Date.now());
        setState({ baseline: content, form: content });
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
      setState({ baseline: result.content, form: result.content });
      if (result.ok) {
        setStatus("Сброшено к дефолту");
        setStatusTone("success");
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
    setDraftDiffersFromServer(false);
    setDraftPayload(null);
    setDraftCalloutOpen(false);
    setRehydrationDetected(false);
    setRehydrationLock(false);
    setGateOpen(false);
    setGateMode("unknown");
  };

  useEffect(() => {
    initialContentRef.current = safeInitialContent;
    setState({ baseline: safeInitialContent, form: safeInitialContent });
  }, [safeInitialContent]);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      let hasDraft = false;
      const baseline = initialContentRef.current;
      const baselineSerialized = JSON.stringify(baseline);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as DraftPayload;
          if (parsed?.content) {
            const differs = JSON.stringify(parsed.content) !== baselineSerialized;
            if (!differs) {
              window.localStorage.removeItem(DRAFT_KEY);
              setDraftFound(false);
              setDraftSavedAt(null);
              setDraftDiffersFromServer(false);
              setDraftPayload(null);
              setDraftCalloutOpen(false);
              setGateOpen(false);
              setGateMode("unknown");
            } else {
              hasDraft = true;
              setDraftPayload(parsed);
              setDraftSavedAt(parsed.savedAt);
              setDraftFound(true);
              setDraftDiffersFromServer(true);
              setDraftCalloutOpen(false);
              setGateOpen(true);
              setGateMode("draft");
            }
          } else {
            window.localStorage.removeItem(DRAFT_KEY);
          }
        } catch {
          window.localStorage.removeItem(DRAFT_KEY);
        }
      }
      if (!hasDraft) {
        setState((prev) => ({ ...prev, form: prev.baseline }));
        setRehydrationLock(false);
        return;
      }
      // Always start from baseline; draft applies only via explicit user action.
      setState((prev) => ({ ...prev, form: prev.baseline }));
      setRehydrationLock(true);
      setFormDomKey(Date.now().toString());
    } finally {
      setBootState("ready");
    }
  }, []);

  useEffect(() => {
    if (!draftPayload || !draftCalloutOpen) return;
    const baseline = initialContentRef.current;
    // Keep baseline while the draft banner is visible; draft applies only via user action.
    if (JSON.stringify(content) !== JSON.stringify(baseline)) {
      setState((prev) => ({ ...prev, form: prev.baseline }));
    }
  }, [content, draftPayload, draftCalloutOpen]);

  useEffect(() => {
    contentRef.current = content;
    dirtyRef.current = isDirty;
    setDirtyGlobal(isDirty);
  }, [content, isDirty, setDirtyGlobal]);

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
        setDraftSavedAt(payload.savedAt);
        setDraftDiffersFromServer(
          JSON.stringify(payload.content) !== JSON.stringify(initialContentRef.current)
        );
        setDraftPayload(payload);
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

  if (!hasInitialContent) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
        <div className="font-semibold">initialContent missing</div>
        <pre className="mt-2 whitespace-pre-wrap text-xs text-rose-700">
          {JSON.stringify(initialContent, null, 2)}
        </pre>
      </div>
    );
  }

  if (bootState !== "ready") {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-700 shadow-sm">
        <div className="font-semibold">Проверяем наличие черновика…</div>
        <div className="mt-1 text-xs text-zinc-500">Это займет несколько секунд.</div>
      </div>
    );
  }

  if (gateOpen) {
    const draftTimestamp = draftSavedAt
      ? new Date(draftSavedAt).toLocaleString("ru-RU")
      : "—";
    return (
      <div className="space-y-6">
        <section className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <div className="font-semibold">
            Найден черновик от {draftTimestamp}. Что сделать?
          </div>
          <div className="mt-1 text-xs text-amber-800">
            Черновик не применён. Выберите действие перед продолжением работы.
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                if (gateMode === "draft" && draftPayload?.content) {
                  setState((prev) => ({ ...prev, form: draftPayload.content }));
                } else {
                  setState((prev) => ({ ...prev, form: prev.baseline }));
                }
                setRehydrationLock(false);
                setRehydrationDetected(false);
                setDraftCalloutOpen(false);
                setGateOpen(false);
                setGateMode("unknown");
              }}
              className="rounded-full bg-[#5E704F] px-4 py-1.5 text-xs font-semibold text-white"
            >
              Применить черновик
            </button>
            <button
              type="button"
              onClick={() => {
                setState((prev) => ({ ...prev, form: prev.baseline }));
                setRehydrationLock(false);
                setRehydrationDetected(false);
                setDraftCalloutOpen(false);
                setGateOpen(false);
                setGateMode("unknown");
              }}
              className="rounded-full border border-amber-300 px-4 py-1.5 text-xs font-semibold text-amber-900"
            >
              Открыть исходные данные
            </button>
            <button
              type="button"
              onClick={() => {
                clearDraft();
                setState((prev) => ({ ...prev, form: prev.baseline }));
                setRehydrationLock(false);
                setRehydrationDetected(false);
                setGateOpen(false);
                setGateMode("unknown");
              }}
              className="rounded-full border border-amber-300 px-4 py-1.5 text-xs font-semibold text-amber-900"
            >
              Удалить черновик
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div key={formDomKey} className="space-y-6">
      {isDirty ? (
        <div className="sticky top-4 z-10 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 shadow-sm">
          Есть несохранённые изменения
        </div>
      ) : null}
      {draftCalloutOpen ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="font-semibold">
            {rehydrationDetected
              ? "Обнаружено восстановление состояния формы. Применить черновик или откатить?"
              : `Найден черновик от ${
                  draftSavedAt ? new Date(draftSavedAt).toLocaleString("ru-RU") : "—"
                }. Применить изменения?`}
          </div>
          <div className="mt-1 text-xs text-amber-800">
            Черновик содержит несохранённые изменения. Выберите действие.
          </div>
          {isDev && rehydrationDetected ? (
            <div className="mt-1 text-xs text-amber-800">
              Обнаружено восстановление состояния формы. Проверьте черновик.
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                if (draftPayload) {
                  setState((prev) => ({ ...prev, form: draftPayload.content }));
                } else {
                  setDraftFound(false);
                }
                setRehydrationLock(false);
                setRehydrationDetected(false);
                setDraftCalloutOpen(false);
              }}
              className="rounded-full bg-[#5E704F] px-4 py-1.5 text-xs font-semibold text-white"
            >
              Применить
            </button>
            <button
              type="button"
              onClick={() => {
                setState((prev) => ({ ...prev, form: prev.baseline }));
                setRehydrationLock(false);
                setRehydrationDetected(false);
                setDraftCalloutOpen(false);
              }}
              className="rounded-full border border-amber-300 px-4 py-1.5 text-xs font-semibold text-amber-900"
            >
              Откатить
            </button>
            <button
              type="button"
              onClick={() => {
                clearDraft();
                setState((prev) => ({ ...prev, form: prev.baseline }));
                setRehydrationLock(false);
                setRehydrationDetected(false);
              }}
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
              onChange={(event) => updateContacts("phone", formatPhone(event.target.value))}
              className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm"
            />
            {validationErrors.contacts.phone ? (
              <span className="text-xs text-rose-600">{validationErrors.contacts.phone}</span>
            ) : null}
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-zinc-800">Почта</span>
            <input
              value={content.contacts.email}
              onChange={(event) => updateContacts("email", event.target.value)}
              className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm"
            />
            {validationErrors.contacts.email ? (
              <span className="text-xs text-rose-600">{validationErrors.contacts.email}</span>
            ) : null}
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-zinc-800">Telegram</span>
            <input
              value={content.contacts.telegram}
              onChange={(event) => updateContacts("telegram", event.target.value)}
              className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm"
            />
            {validationErrors.contacts.telegram ? (
              <span className="text-xs text-rose-600">{validationErrors.contacts.telegram}</span>
            ) : null}
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-zinc-800">VK</span>
            <input
              value={content.contacts.vk}
              onChange={(event) => updateContacts("vk", event.target.value)}
              className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm"
            />
            {validationErrors.contacts.vk ? (
              <span className="text-xs text-rose-600">{validationErrors.contacts.vk}</span>
            ) : null}
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
            {validationErrors.payment.inn ? (
              <span className="text-xs text-rose-600">{validationErrors.payment.inn}</span>
            ) : null}
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-zinc-800">КПП</span>
            <input
              value={content.paymentDetails.kpp}
              onChange={(event) => updatePayment("kpp", event.target.value)}
              className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm"
            />
            {validationErrors.payment.kpp ? (
              <span className="text-xs text-rose-600">{validationErrors.payment.kpp}</span>
            ) : null}
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
            onClick={() => {
              if (rehydrationLock) return;
              setContent((prev) => ({
                ...prev,
                accessSteps: [...prev.accessSteps, ""],
              }));
            }}
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
            onClick={() => {
              if (rehydrationLock) return;
              setContent((prev) => ({
                ...prev,
                faq: [...prev.faq, createFaqItem()],
              }));
            }}
            className="text-xs font-semibold text-[#5E704F] underline"
          >
            Добавить вопрос
          </button>
        </div>
        <div className="mt-4 space-y-4">
          {content.faq.map((item, index) => (
            <div key={`faq-${index}`} className="space-y-3">
              <div
                onDragOver={(event) => handleFaqDragOver(index, event)}
                onDrop={(event) => handleFaqDrop(index, event)}
                className={`relative rounded-2xl border border-zinc-200 p-4 ${
                  dragFaqIndex === index ? "opacity-60" : ""
                }`}
              >
                {dragFaqIndex !== null &&
                dragFaqOverIndex === index &&
                dragFaqIndex !== index &&
                faqDropPosition ? (
                  <div
                    className={`pointer-events-none absolute left-0 right-0 h-0.5 rounded-full bg-sky-500 ${
                      faqDropPosition === "above" ? "top-0" : "bottom-0"
                    }`}
                  />
                ) : null}
                <div className="flex gap-3">
                  <button
                    type="button"
                    draggable
                    onDragStart={(event) => handleFaqDragStart(index, event)}
                    onDragEnd={handleFaqDragEnd}
                    className="mt-1 h-8 w-8 shrink-0 rounded-full border border-zinc-200 text-sm text-zinc-500 hover:text-zinc-700"
                    aria-label="Перетащить вопрос"
                  >
                    ≡
                  </button>
                  <div className="flex-1">
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
                            }
                          )
                        }
                        className="mt-3 text-xs font-semibold text-rose-600"
                      >
                        Удалить вопрос
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
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
                  <div key={doc.id} className="space-y-3">
                    <div
                      onDragOver={(event) => handleDocDragOver(categoryIndex, docIndex, event)}
                      onDrop={(event) => handleDocDrop(categoryIndex, docIndex, event)}
                      className={`relative rounded-2xl border border-zinc-200 p-4 ${
                        dragDoc?.categoryIndex === categoryIndex && dragDoc.index === docIndex
                          ? "opacity-60"
                          : ""
                      }`}
                    >
                      {dragDoc &&
                      dragDocOver &&
                      dragDoc.categoryIndex === categoryIndex &&
                      dragDocOver.index === docIndex &&
                      dragDoc.index !== docIndex &&
                      docDropPosition ? (
                        <div
                          className={`pointer-events-none absolute left-0 right-0 h-0.5 rounded-full bg-sky-500 ${
                            docDropPosition === "above" ? "top-0" : "bottom-0"
                          }`}
                        />
                      ) : null}
                      <div className="flex gap-3">
                        <button
                          type="button"
                          draggable
                          onDragStart={(event) =>
                            handleDocDragStart(categoryIndex, docIndex, event)
                          }
                          onDragEnd={handleDocDragEnd}
                          className="mt-1 h-8 w-8 shrink-0 rounded-full border border-zinc-200 text-sm text-zinc-500 hover:text-zinc-700"
                          aria-label="Перетащить документ"
                        >
                          ≡
                        </button>
                        <div className="grid flex-1 gap-3 md:grid-cols-2">
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
                            {validationErrors.documents[doc.id] ? (
                              <span className="text-xs text-rose-600">
                                {validationErrors.documents[doc.id]}
                              </span>
                            ) : null}
                          </label>
                        </div>
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
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (rehydrationLock) return;
                  updateCategory(categoryIndex, {
                    documents: [...category.documents, createDocumentItem()],
                  });
                }}
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
          disabled={!canSave || isPending || hasErrors || !isDirty}
          className="rounded-full bg-[#5E704F] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Сохранение…" : "Сохранить"}
        </button>
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:border-zinc-400"
        >
          Предпросмотр
        </button>
        {!canSave ? (
          <div className="text-xs text-amber-700">Сохранение недоступно в PROD</div>
        ) : hasErrors ? (
          <div className="text-xs text-rose-600">Исправьте ошибки</div>
        ) : null}
        {isDirty ? (
          <div className="text-xs font-semibold text-amber-700">
            Есть несохранённые изменения
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
          <span className="font-semibold text-zinc-700">
            {lastSavedAt
              ? `✓ Последнее сохранение: ${new Date(lastSavedAt).toLocaleString("ru-RU", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : "Данные загружены"}
          </span>
          {lastSavedAt ? <span>Изменения опубликованы на сайте.</span> : null}
          <div className="flex items-center gap-2">
            <a
              href={`/?v=${lastSavedAt ?? initialLoadedAtRef.current}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-[#5E704F] underline"
            >
              Открыть главную
            </a>
            <a
              href={`/documents?v=${lastSavedAt ?? initialLoadedAtRef.current}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-[#5E704F] underline"
            >
              Открыть документы
            </a>
          </div>
        </div>
        {isDev ? (
          <div className="text-xs text-zinc-500">
            beforeunload: {isDirty ? "armed" : "off"} · draft:{" "}
            {draftFound ? "present" : "none"} · diff:{" "}
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

      {previewOpen ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="max-h-[85vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">Предпросмотр</h2>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-600"
              >
                Закрыть
              </button>
            </div>

            <div className="mt-6 space-y-8">
              <section className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  Главная
                </h3>
                <div className="space-y-3 rounded-2xl border border-zinc-200 p-4">
                  <div className="text-sm font-semibold text-zinc-900">Контакты правления</div>
                  <div className="text-xs text-zinc-700">
                    Телефон: {content.contacts.phone || "—"}
                  </div>
                  <div className="text-xs text-zinc-700">
                    Почта: {content.contacts.email || "—"}
                  </div>
                  <div className="text-xs text-zinc-700">
                    Telegram: {content.contacts.telegram || "—"}
                  </div>
                  <div className="text-xs text-zinc-700">VK: {content.contacts.vk || "—"}</div>
                </div>
                <div className="space-y-2 rounded-2xl border border-zinc-200 p-4">
                  <div className="text-sm font-semibold text-zinc-900">Реквизиты</div>
                  <div className="text-xs text-zinc-700">
                    Получатель: {content.paymentDetails.receiver || "—"}
                  </div>
                  <div className="text-xs text-zinc-700">
                    ИНН/КПП: {content.paymentDetails.inn || "—"} /{" "}
                    {content.paymentDetails.kpp || "—"}
                  </div>
                  <div className="text-xs text-zinc-700">
                    Р/с: {content.paymentDetails.account || "—"}
                  </div>
                  <div className="text-xs text-zinc-700">
                    Банк: {content.paymentDetails.bank || "—"}
                  </div>
                  <div className="text-xs text-zinc-700">
                    БИК: {content.paymentDetails.bic || "—"}
                  </div>
                  <div className="text-xs text-zinc-700">
                    Корр. счёт: {content.paymentDetails.corr || "—"}
                  </div>
                </div>
                <div className="space-y-2 rounded-2xl border border-zinc-200 p-4">
                  <div className="text-sm font-semibold text-zinc-900">Как получить доступ</div>
                  <ol className="list-decimal space-y-1 pl-5 text-xs text-zinc-700">
                    {content.accessSteps.map((step, index) => (
                      <li key={`preview-access-${index}`}>{step || "—"}</li>
                    ))}
                  </ol>
                </div>
                <div className="space-y-2 rounded-2xl border border-zinc-200 p-4">
                  <div className="text-sm font-semibold text-zinc-900">FAQ</div>
                  <div className="space-y-2 text-xs text-zinc-700">
                    {content.faq.map((item, index) => (
                      <div key={`preview-faq-${index}`}>
                        <div className="font-semibold">{item.question || "—"}</div>
                        <div className="text-zinc-600">{item.answer || "—"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  Документы
                </h3>
                <div className="space-y-4">
                  {content.documentsByCategory.map((category) => (
                    <div
                      key={`preview-docs-${category.key}`}
                      className="rounded-2xl border border-zinc-200 p-4"
                    >
                      <div className="text-sm font-semibold text-zinc-900">{category.label}</div>
                      <div className="mt-2 space-y-2 text-xs text-zinc-700">
                        {category.documents.map((doc) => (
                          <div key={`preview-doc-${doc.id}`}>
                            <div className="font-semibold">{doc.title || "—"}</div>
                            <div className="text-zinc-500">{doc.date || "—"}</div>
                            <div className="text-zinc-600">{doc.description || "—"}</div>
                            <div className="text-zinc-500">{doc.downloadUrl || "—"}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}

      {leaveDialogOpen ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold">Есть несохранённые изменения</h3>
            <div className="mt-3 space-y-2 text-sm text-zinc-700">
              {leaveDiffs.length === 0 ? (
                <div>Изменения обнаружены, но детальный список недоступен.</div>
              ) : (
                <ul className="list-disc space-y-1 pl-5">
                  {leaveDiffs.map((item, index) => (
                    <li key={`diff-${index}`}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  pendingNavigationRef.current = null;
                  setLeaveDialogOpen(false);
                }}
                className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    const result = await onSave(contentRef.current);
                    if (result.ok) {
                      setStatus("✓ Опубликовано");
                      setStatusTone("success");
                      setState({ baseline: contentRef.current, form: contentRef.current });
                      clearDraft();
                      setLeaveDialogOpen(false);
                      pendingNavigationRef.current?.();
                      pendingNavigationRef.current = null;
                    } else {
                      setStatus(
                        result.reason
                          ? `Не удалось сохранить: ${result.reason}`
                          : "Не удалось сохранить"
                      );
                      setStatusTone("error");
                    }
                  });
                }}
                className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Сохранение…" : "Сохранить и перейти"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setLeaveDialogOpen(false);
                  pendingNavigationRef.current?.();
                  pendingNavigationRef.current = null;
                }}
                className="rounded-full border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700"
              >
                Покинуть
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
