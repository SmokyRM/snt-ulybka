"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  generateAIResponse,
  getRecommendedQuestions,
  type AIContext,
  type AIQuestionType,
  type AIResponse,
} from "@/lib/aiHelper";

type Props = {
  context: AIContext;
};

const questions: Array<{ type: AIQuestionType; label: string }> = [
  { type: "plot_pending", label: "Что значит «На проверке»?" },
  { type: "plot_rejected", label: "Почему заявку отклонили?" },
  { type: "plot_need_confirmation", label: "Зачем подтверждать участок?" },
  { type: "debt_reason", label: "Почему у меня есть долг?" },
  { type: "membership_requirements", label: "Что нужно, чтобы стать членом СНТ?" },
  { type: "fee_calculation", label: "Как рассчитываются взносы?" },
  { type: "what_to_confirm", label: "Что мне нужно подтвердить?" },
];

export function AIHelper({ context }: Props) {
  const [open, setOpen] = useState(false);
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [showAll, setShowAll] = useState(false);

  const recommended = useMemo(() => {
    const preferred = getRecommendedQuestions(context);
    return questions.filter((q) => preferred.includes(q.type)).slice(0, 3);
  }, [context]);

  const allQuestions = useMemo(() => questions, []);

  const logQuestion = async (type: AIQuestionType) => {
    try {
      await fetch("/api/ai-helper/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionType: type,
          hasDebt: (context.membershipDebt ?? 0) > 0 || (context.electricityDebt ?? 0) > 0,
          plotsCount: context.plotsCount,
          membershipStatus: context.membershipStatus,
          ts: new Date().toISOString(),
        }),
      });
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[ai-helper] log failed", error);
      }
    }
  };

  const handleQuestion = (type: AIQuestionType) => {
    setResponse(generateAIResponse(context, type));
    setOpen(true);
    void logQuestion(type);
  };

  const severityLabel: Record<NonNullable<AIResponse["severity"]>, string> = {
    info: "Инфо",
    warning: "Важно",
    danger: "Срочно",
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">ИИ-помощник</h2>
          <p className="text-xs text-zinc-600">Быстрые ответы на частые вопросы кабинета.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="rounded-full border border-[#5E704F] px-3 py-1 text-xs font-semibold text-[#5E704F] hover:border-[#4d5d41]"
        >
          {open ? "Скрыть" : "ИИ-помощник"}
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-3">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {recommended.map((q) => (
                <button
                  key={q.type}
                  type="button"
                  onClick={() => handleQuestion(q.type)}
                  className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-800 hover:border-zinc-400"
                >
                  {q.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="text-xs font-semibold text-[#5E704F] hover:text-[#4d5d41]"
            >
              {showAll ? "Скрыть все вопросы" : "Все вопросы"}
            </button>
            {showAll && (
              <div className="flex flex-wrap gap-2">
                {allQuestions.map((q) => (
                  <button
                    key={q.type}
                    type="button"
                    onClick={() => handleQuestion(q.type)}
                    className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-zinc-300"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {response && (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-800">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <span>Ответ помощника</span>
                {response.severity && (
                  <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[11px] font-semibold text-zinc-700">
                    {severityLabel[response.severity]}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-zinc-700">{response.text}</p>
              {response.bullets && response.bullets.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-zinc-700">
                  {response.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              {response.actions && response.actions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {response.actions.map((action) => (
                    <Link
                      key={`${action.label}-${action.href}`}
                      href={action.href}
                      className="rounded-full border border-[#5E704F] px-3 py-1 text-xs font-semibold text-[#5E704F] hover:border-[#4d5d41]"
                    >
                      {action.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
