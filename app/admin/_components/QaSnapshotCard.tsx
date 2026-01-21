"use client";

import { useEffect, useState } from "react";
import { buildEnvSnapshot, formatEnvSnapshot, type EnvInfo, type EnvSnapshot, type SessionSnapshot } from "@/lib/qa/report";
import { readOk } from "@/lib/api/client";

type QaSnapshotCardProps = {
  envInfo: EnvInfo;
  sessionSnapshot: SessionSnapshot;
};

export default function QaSnapshotCard({ envInfo, sessionSnapshot }: QaSnapshotCardProps) {
  const [snapshot, setSnapshot] = useState<EnvSnapshot | null>(null);
  const [copied, setCopied] = useState(false);
  const [inserted, setInserted] = useState(false);

  const buildSnapshot = async () => {
    const currentUrl = typeof window !== "undefined" ? window.location.href : "—";
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : undefined;
    const timezone = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined;

    // Собираем request-ids из результатов проверок
    const requestIds: string[] = [];
    if (typeof window !== "undefined") {
      try {
        const checksStr = window.localStorage.getItem("qa-checks-results");
        if (checksStr) {
          const checks = JSON.parse(checksStr) as Array<{ requestId?: string }>;
          checks.forEach((check) => {
            if (check.requestId && !requestIds.includes(check.requestId)) {
              requestIds.push(check.requestId);
            }
          });
        }
      } catch {
        // ignore
      }
    }

    // Пытаемся получить feature flags через API
    let featureFlags: Record<string, boolean> | undefined;
    let featureFlagsRequestId: string | undefined;
    if (typeof window !== "undefined") {
      try {
        const response = await fetch("/api/admin/feature-flags");
        const responseRequestId = response.headers.get("x-request-id");
        if (responseRequestId && !requestIds.includes(responseRequestId)) {
          requestIds.push(responseRequestId);
        }
        const data = await readOk<{ flags?: Record<string, unknown> }>(response);
        if (data.flags && typeof data.flags === "object") {
          // Фильтруем только true/false значения, без чувствительных данных
          featureFlags = {};
          Object.entries(data.flags).forEach(([key, value]) => {
            if (typeof value === "boolean") {
              featureFlags![key] = value;
            }
          });
          // Сохраняем в localStorage для будущего использования
          window.localStorage.setItem("qa-feature-flags", JSON.stringify(featureFlags));
        }
      } catch {
        // Если API недоступен, пытаемся получить из localStorage
        try {
          const flagsStr = window.localStorage.getItem("qa-feature-flags");
          if (flagsStr) {
            const parsed = JSON.parse(flagsStr);
            if (typeof parsed === "object" && parsed !== null) {
              featureFlags = parsed;
            }
          }
        } catch {
          // ignore
        }
      }
    }

    const newSnapshot = buildEnvSnapshot(envInfo, sessionSnapshot, currentUrl, userAgent, timezone, featureFlags, requestIds.length > 0 ? requestIds : undefined);
    setSnapshot(newSnapshot);

    // Сохраняем в localStorage для автовставки
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("qa-env-snapshot", JSON.stringify(newSnapshot));
      } catch {
        // ignore
      }
    }
  };

  useEffect(() => {
    // Пытаемся загрузить сохранённый снимок только один раз при монтировании
    if (typeof window !== "undefined" && snapshot === null) {
      try {
        const saved = window.localStorage.getItem("qa-env-snapshot");
        if (saved) {
          const parsed = JSON.parse(saved);
          // Восстанавливаем timestamp как Date
          if (parsed.timestamp) {
            parsed.timestamp = new Date(parsed.timestamp);
          }
          setSnapshot(parsed as EnvSnapshot);
        }
      } catch {
        // ignore
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopy = async () => {
    if (!snapshot) return;

    const text = formatEnvSnapshot(snapshot);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // ignore
      }
      document.body.removeChild(textArea);
    }
  };

  const handleInsert = () => {
    if (!snapshot) return;

    const snapshotText = formatEnvSnapshot(snapshot);
    const insertText = `\n\n${snapshotText}\n\n`;

    // Ищем поле "Шаги воспроизведения" в форме баг-репорта
    if (typeof window !== "undefined") {
      const stepsField = document.getElementById("qa-bug-steps") as HTMLTextAreaElement | null;
      if (stepsField) {
        const currentValue = stepsField.value;
        // Вставляем снимок в конец поля "Шаги", чтобы не мешал основному тексту
        stepsField.value = currentValue + (currentValue.trim() ? "\n\n" : "") + insertText.trim();
        // Триггерим событие change для обновления состояния
        stepsField.dispatchEvent(new Event("input", { bubbles: true }));
        setInserted(true);
        setTimeout(() => setInserted(false), 2000);
      }
    }
  };

  const preview = snapshot
    ? `${snapshot.env.NODE_ENV || "—"} | ${snapshot.env.NEXT_PUBLIC_APP_VERSION || "—"} | ${snapshot.session.role || "—"} | ${formatDateTime(snapshot.timestamp)}`
    : "Снимок ещё не собран";

  return (
    <section
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
      data-testid="qa-snapshot-card"
    >
      <h2 className="mb-2 text-lg font-semibold text-zinc-900">Снимок среды</h2>
      <p className="mb-4 text-xs text-zinc-500">
        Соберите снимок текущего окружения для включения в отчёты и баг-репорты.
      </p>

      <div className="space-y-4">
        {/* Preview */}
        {snapshot && (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
            <div className="font-medium mb-1">Краткий preview:</div>
            <div className="space-y-1">
              <div>Env: {snapshot.env.NODE_ENV || "—"}</div>
              <div>Версия: {snapshot.env.NEXT_PUBLIC_APP_VERSION || "—"}</div>
              <div>Роль: {snapshot.session.role || "—"}</div>
              <div>URL: {snapshot.currentUrl.length > 50 ? `${snapshot.currentUrl.substring(0, 50)}...` : snapshot.currentUrl}</div>
              <div>Время: {formatDateTime(snapshot.timestamp)}</div>
            </div>
          </div>
        )}

        {/* Кнопки */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={buildSnapshot}
            data-testid="qa-snapshot-build"
            className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41] focus:outline-none focus:ring-2 focus:ring-[#5E704F] focus:ring-offset-1"
            aria-label="Собрать снимок текущего окружения"
          >
            Собрать снимок
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!snapshot}
            data-testid="qa-snapshot-copy"
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-[#5E704F] hover:bg-[#5E704F]/5 hover:text-[#5E704F] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#5E704F] focus:ring-offset-1"
            aria-label={copied ? "Снимок скопирован" : "Скопировать снимок в буфер обмена"}
            aria-live="polite"
          >
            {copied ? "Скопировано" : "Скопировать снимок"}
          </button>
          <button
            type="button"
            onClick={handleInsert}
            disabled={!snapshot}
            data-testid="qa-snapshot-insert"
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-[#5E704F] hover:bg-[#5E704F]/5 hover:text-[#5E704F] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#5E704F] focus:ring-offset-1"
            aria-label={inserted ? "Снимок вставлен в баг-репорт" : "Вставить снимок в форму баг-репорта"}
            aria-live="polite"
          >
            {inserted ? "Вставлено" : "Вставить в баг-репорт"}
          </button>
        </div>
      </div>
    </section>
  );
}

function formatDateTime(date: Date): string {
  return date.toLocaleString("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
