"use client";

import { useState } from "react";
import type { DataQualityIssue, DataQualityIssueType } from "@/server/services/dataQuality";
import type { Role } from "@/lib/permissions";
import AppLink from "@/components/AppLink";
import { apiPost } from "@/lib/api/client";

type Props = {
  issuesByType: Record<DataQualityIssueType, DataQualityIssue[]>;
  typeLabels: Record<DataQualityIssueType, string>;
  severityLabels: Record<"low" | "medium" | "high", string>;
  severityClass: Record<"low" | "medium" | "high", string>;
  role: Role;
  canSeeAppealsPlots: boolean;
  canSeePayments: boolean;
  category?: "missingContact" | "missingPlot" | "missingDueAt" | "missingAssignee";
};

export default function QualityClient({
  issuesByType,
  typeLabels,
  severityLabels,
  severityClass,
  role,
  canSeeAppealsPlots,
  canSeePayments,
  category,
}: Props) {
  const [fixing, setFixing] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<Record<string, string>>({});

  const handleFix = async (issue: DataQualityIssue) => {
    if (!issue.suggestedFix) return;

    setFixing((prev) => new Set(prev).add(issue.id));

    try {
      const data = await apiPost<{ success?: boolean; message?: string; error?: string; redirectUrl?: string }>(
        "/api/office/quality",
        {
          issueId: issue.id,
          fixType: issue.suggestedFix.type,
          payload: issue.suggestedFix.payload,
        }
      );

      if (data.success) {
        setMessages((prev) => ({ ...prev, [issue.id]: data.message || "" }));
        
        // Если есть redirectUrl, переходим туда
        if (data.redirectUrl) {
          window.location.href = data.redirectUrl;
          return;
        }
        
        // Иначе перезагружаем страницу через 1 секунду
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setMessages((prev) => ({ ...prev, [issue.id]: data.error || "Ошибка при применении исправления" }));
      }
    } catch (error) {
      setMessages((prev) => ({ ...prev, [issue.id]: "Ошибка сети" }));
    } finally {
      setFixing((prev) => {
        const next = new Set(prev);
        next.delete(issue.id);
        return next;
      });
    }
  };

  const canFixIssue = (issue: DataQualityIssue): boolean => {
    if (!issue.suggestedFix) return false;

    if (issue.entityType === "plots") {
      return canSeeAppealsPlots;
    }
    if (issue.entityType === "appeals") {
      return canSeeAppealsPlots;
    }
    if (issue.entityType === "payments") {
      return canSeePayments && (role === "admin" || role === "accountant");
    }
    return false;
  };

  const renderIssue = (issue: DataQualityIssue) => {
    const canFix = canFixIssue(issue);
    const isFixing = fixing.has(issue.id);
    const message = messages[issue.id];
    const category = issue.metadata?.category as string | undefined;

    return (
      <div
        key={issue.id}
        className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
        data-testid={`quality-row-${issue.entityId}`}
        data-quality-category={category}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${severityClass[issue.severity]}`} data-testid="quality-item-severity">
                {severityLabels[issue.severity]}
              </span>
              {category && (
                <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700" data-testid="quality-item-category">
                  {category}
                </span>
              )}
              <span className="text-xs text-zinc-500" data-testid="quality-item-entity-id">#{issue.entityId}</span>
            </div>
            <p className="mt-2 text-sm font-medium text-zinc-900" data-testid="quality-item-reason">{issue.reason}</p>
            {issue.metadata && (
              <div className="mt-2 text-xs text-zinc-600" data-testid="quality-item-metadata">
                {issue.metadata.plotNumber != null && (
                  <div>Участок: {String(issue.metadata.plotNumber)}</div>
                )}
                {issue.metadata.title != null && (
                  <div>Обращение: {String(issue.metadata.title)}</div>
                )}
                {issue.metadata.authorName != null && (
                  <div>Автор: {String(issue.metadata.authorName)}</div>
                )}
                {issue.metadata.amount != null && (
                  <div>Сумма: {String(issue.metadata.amount)} ₽</div>
                )}
              </div>
            )}
            {message && (
              <div className={`mt-2 text-xs ${message.includes("Ошибка") ? "text-red-600" : "text-emerald-600"}`} data-testid="quality-item-message">
                {message}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {issue.entityType === "appeals" && (
              <AppLink
                href={`/office/appeals/${issue.entityId}`}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:border-[#5E704F]"
                data-testid="quality-item-view-appeal"
              >
                Открыть
              </AppLink>
            )}
            {canFix && issue.suggestedFix && (
              <button
                onClick={() => handleFix(issue)}
                disabled={isFixing}
                className="rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4d5d41] disabled:opacity-50"
                data-testid={`quality-fix-${issue.suggestedFix.type}-${issue.entityId}`}
                data-fix-type={issue.suggestedFix.type}
              >
                {isFixing ? "Применяется..." : issue.suggestedFix.label}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Секция: Участки */}
      {canSeeAppealsPlots && issuesByType.plots.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-zinc-900">{typeLabels.plots}</h2>
          <div className="space-y-3">
            {issuesByType.plots.map(renderIssue)}
          </div>
        </section>
      )}

      {/* Секция: Обращения */}
      {canSeeAppealsPlots && issuesByType.appeals.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-zinc-900">{typeLabels.appeals}</h2>
          <div className="space-y-3">
            {issuesByType.appeals.map(renderIssue)}
          </div>
        </section>
      )}

      {/* Секция: Платежи */}
      {canSeePayments && issuesByType.payments.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-zinc-900">{typeLabels.payments}</h2>
          <div className="space-y-3">
            {issuesByType.payments.map(renderIssue)}
          </div>
        </section>
      )}

      {/* Пустое состояние */}
      {issuesByType.plots.length === 0 && issuesByType.appeals.length === 0 && issuesByType.payments.length === 0 && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-8 text-center" data-testid="quality-empty">
          <p className="text-sm text-zinc-600">Проблем не найдено.</p>
        </div>
      )}
    </div>
  );
}
