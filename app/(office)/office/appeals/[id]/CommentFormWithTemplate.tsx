"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api/client";

type Props = {
  appealId: string;
  templates: Array<{ id: string; title: string; content: string; category?: string }>;
};

export default function CommentFormWithTemplate({ appealId, templates }: Props) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTemplateSelect, setShowTemplateSelect] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInsertTemplate = (templateContent: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const before = text.substring(0, start);
      const after = text.substring(end);
      setText(before + templateContent + after);
      setShowTemplateSelect(false);
      // Устанавливаем курсор после вставленного текста
      setTimeout(() => {
        textarea.focus();
        const newPos = start + templateContent.length;
        textarea.setSelectionRange(newPos, newPos);
      }, 0);
    } else {
      setText(text + templateContent);
      setShowTemplateSelect(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    try {
      await apiPost<{ appeal: { id: string } }>(`/api/office/appeals/${appealId}/comment`, {
        text: text.trim(),
      });
      setText("");
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Ошибка добавления комментария");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-zinc-800">Добавить комментарий</label>
        {templates.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTemplateSelect(!showTemplateSelect)}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:border-[#5E704F]"
              data-testid="appeal-insert-template"
            >
              Вставить шаблон
            </button>
            {showTemplateSelect && (
              <div className="absolute right-0 top-full z-10 mt-1 w-64 rounded-lg border border-zinc-200 bg-white shadow-lg">
                <div className="max-h-64 overflow-y-auto p-1">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => handleInsertTemplate(template.content)}
                      className="w-full rounded px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                    >
                      <div className="font-semibold">{template.title}</div>
                      {template.category && (
                        <div className="text-xs text-zinc-500">{template.category}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Введите комментарий..."
        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:border-[#5E704F] focus:outline-none"
      />
      <button
        type="submit"
        disabled={loading || !text.trim()}
        className="rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4d5d41] disabled:opacity-50"
      >
        {loading ? "Отправка..." : "Добавить комментарий"}
      </button>
    </form>
  );
}
