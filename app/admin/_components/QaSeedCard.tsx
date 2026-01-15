"use client";

import { useState } from "react";
import QaCopyButton from "./QaCopyButton";
import { qaText } from "@/lib/qaText";
import { dangerButtonClass, primaryButtonClass, secondaryButtonClass } from "./qaStyles";

type SeedResult = {
  appeal?: { id: string; url: string };
  announcement?: { id: string; url: string };
};

export default function QaSeedCard() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SeedResult | null>(null);
  const [openAfter, setOpenAfter] = useState(false);
  const [status, setStatus] = useState<{ type: "idle" | "loading" | "success" | "error"; message?: string }>({
    type: "idle",
  });

  const handleSeed = async (create: string[]) => {
    setLoading(true);
    setResult(null);
    setStatus({ type: "loading", message: qaText.messages.seedRunning });
    try {
      const response = await fetch("/api/admin/qa/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ create, openAfter }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: qaText.messages.unknownError }));
        setStatus({ type: "error", message: `${qaText.messages.error}: ${error.error || qaText.messages.seedError}` });
        return;
      }

      const data = await response.json();
      setResult(data.created || {});
      setStatus({ type: "success", message: qaText.messages.seedSuccess });

      // Открываем созданные записи в новых вкладках, если опция включена
      if (openAfter && data.created) {
        if (data.created.appeal) {
          window.open(data.created.appeal.url, "_blank");
        }
        if (data.created.announcement) {
          window.open(data.created.announcement.url, "_blank");
        }
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: `${qaText.messages.error}: ${error instanceof Error ? error.message : qaText.messages.unknownError}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResult(null);
    setStatus({ type: "idle", message: qaText.messages.seedClear });
  };

  const renderBanner = () => {
    if (status.type === "idle" && !status.message) return null;
    const map = {
      loading: "border-blue-200 bg-blue-50 text-blue-800",
      success: "border-green-200 bg-green-50 text-green-800",
      error: "border-red-200 bg-red-50 text-red-800",
      idle: "border-zinc-200 bg-zinc-50 text-zinc-600",
    } as const;
    const cls = map[status.type];
    return (
      <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${cls}`}>
        {status.message || qaText.messages.success}
      </div>
    );
  };

  return (
    <section
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
      data-testid="qa-seed-card"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-zinc-900">{qaText.headers.testDataGenerator}</h2>
          <p className="text-xs text-zinc-500" data-testid="qa-help-seed">
            {qaText.hints.seed}
          </p>
          <p className="text-sm text-zinc-600">{qaText.misc.seedDescription}</p>
        </div>

        {renderBanner()}

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleSeed(["appeal"])}
              disabled={loading}
              data-testid="qa-seed-appeal"
              className={secondaryButtonClass}
              aria-label={loading ? "Создание тестового обращения..." : "Создать тестовое обращение"}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {qaText.buttons.loading}
                </span>
              ) : (
                qaText.buttons.createTestAppeal
              )}
            </button>
            <button
              type="button"
              onClick={() => handleSeed(["announcement"])}
              disabled={loading}
              data-testid="qa-seed-announcement"
              className={secondaryButtonClass}
              aria-label={loading ? "Создание тестового объявления..." : "Создать тестовое объявление"}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {qaText.buttons.loading}
                </span>
              ) : (
                qaText.buttons.createTestAnnouncement
              )}
            </button>
            <button
              type="button"
              onClick={() => handleSeed(["appeal", "announcement"])}
              disabled={loading}
              data-testid="qa-seed-both"
              className={primaryButtonClass}
              aria-label={loading ? "Создание тестовых данных..." : "Создать тестовое обращение и объявление"}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {qaText.buttons.loading}
                </span>
              ) : (
                qaText.buttons.createBoth
              )}
            </button>
          </div>

          <label className="flex items-center gap-2 text-sm focus-within:outline-none focus-within:ring-2 focus-within:ring-[#5E704F] focus-within:ring-offset-1 rounded p-1 -m-1">
            <input
              type="checkbox"
              checked={openAfter}
              onChange={(e) => setOpenAfter(e.target.checked)}
              data-testid="qa-seed-open"
              className="h-4 w-4 rounded border-zinc-300 text-[#5E704F] focus:ring-2 focus:ring-[#5E704F] focus:ring-offset-1"
              aria-label="Открыть созданные записи в новых вкладках"
            />
            <span className="text-zinc-700">{qaText.labels.openCreated}</span>
          </label>
        </div>

        {!result && !loading && (
          <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-center">
            <div className="text-sm text-zinc-600">{qaText.messages.emptySeed}</div>
          </div>
        )}

        {result && (
          <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <div className="text-sm font-semibold text-zinc-900">{qaText.labels.created}:</div>
            {result.appeal && (
              <div className="flex items-center gap-2 text-sm" data-testid="qa-seed-result-appeal">
                <span className="font-medium text-zinc-700">{qaText.labels.appeal}:</span>
                <code className="rounded bg-white px-2 py-1 font-mono text-xs text-zinc-900">{result.appeal.id}</code>
                <a
                  href={result.appeal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#5E704F] hover:underline"
                >
                  {result.appeal.url}
                </a>
                <QaCopyButton value={result.appeal.url} testId="qa-seed-copy-appeal-url" label={qaText.labels.appealUrl} />
              </div>
            )}
            {result.announcement && (
              <div className="flex items-center gap-2 text-sm" data-testid="qa-seed-result-announcement">
                <span className="font-medium text-zinc-700">{qaText.labels.announcement}:</span>
                <code className="rounded bg-white px-2 py-1 font-mono text-xs text-zinc-900">
                  {result.announcement.id}
                </code>
                <a
                  href={result.announcement.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#5E704F] hover:underline"
                >
                  {result.announcement.url}
                </a>
                <QaCopyButton
                  value={result.announcement.url}
                  testId="qa-seed-copy-announcement-url"
                  label={qaText.labels.announcementUrl}
                />
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={clearResults}
              disabled={loading || !result}
              data-testid="qa-clear-seed"
              className={secondaryButtonClass}
              aria-label="Очистить результаты создания тестовых данных"
            >
              {qaText.buttons.clearResults}
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!confirm(qaText.messages.cleanupConfirm)) return;
                setLoading(true);
                setStatus({ type: "loading", message: qaText.messages.cleanupRunning });
                try {
                  const response = await fetch("/api/admin/qa/cleanup", {
                    method: "POST",
                  });
                  if (!response.ok) {
                    const error = await response.json().catch(() => ({ error: qaText.messages.unknownError }));
                    setStatus({
                      type: "error",
                      message: `${qaText.messages.error}: ${error.error || qaText.messages.cleanupError}`,
                    });
                    return;
                  }
                  const data = await response.json();
                  setStatus({
                    type: "success",
                    message: qaText.messages.cleanupSuccess(data.deleted.appeals || 0, data.deleted.announcements || 0),
                  });
                  setResult(null);
                } catch (error) {
                  setStatus({
                    type: "error",
                    message: `${qaText.messages.error}: ${
                      error instanceof Error ? error.message : qaText.messages.unknownError
                    }`,
                  });
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              data-testid="qa-cleanup"
              className={dangerButtonClass}
              aria-label="Очистить все тестовые данные с префиксом [QA]"
            >
              {qaText.buttons.cleanupQaData}
            </button>
          </div>
          {status.type !== "idle" && <span className="text-xs text-zinc-500">{status.message}</span>}
        </div>
      </div>
    </section>
  );
}
