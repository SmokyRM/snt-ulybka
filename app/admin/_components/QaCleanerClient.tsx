"use client";

/**
 * QA components must stay admin-only to avoid RSC bundling leaks.
 */
import { useState } from "react";

const SESSION_KEYS = ["prefillAppealText", "appeal.prefill.text"];
const LOCAL_KEYS = [
  "assistantWidgetSize:v1",
  "assistantUiScale:v1",
  "assistantTextSize:v1",
  "assistantOnboardingSeen:v1",
];

export default function QaCleanerClient() {
  const [done, setDone] = useState(false);

  const handleClear = () => {
    try {
      SESSION_KEYS.forEach((key) => {
        try {
          window.sessionStorage.removeItem(key);
        } catch {
          /* noop */
        }
      });
      LOCAL_KEYS.forEach((key) => {
        try {
          window.localStorage.removeItem(key);
        } catch {
          /* noop */
        }
      });
    } catch {
      /* ignore */
    }
    setDone(true);
    window.setTimeout(() => setDone(false), 2000);
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClear}
        className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-800 hover:border-[#5E704F] hover:text-[#5E704F]"
      >
        Очистить тестовые состояния
      </button>
      {done ? <div className="text-xs text-green-700">Очищено.</div> : null}
      <p className="text-xs text-zinc-500">
        Удаляет prefill и локальные ключи UI (масштаб/виджет). Cookie qaScenario очищайте кнопкой выше.
      </p>
    </div>
  );
}
