"use client";

import { useState } from "react";
import type { FeatureFlags } from "@/lib/featureFlags";
import type { AiSettings } from "@/lib/aiSettings";

type Props = {
  flags: FeatureFlags;
  settings: AiSettings;
};

type UpdatePayload = {
  ai_widget_enabled?: boolean;
  ai_personal_enabled?: boolean;
  strictMode?: boolean;
  verbosity?: "short" | "normal";
  citations?: boolean;
  temperature?: "low" | "medium";
  ai_answer_style?: "short" | "normal" | "detailed";
  ai_tone?: "official" | "simple";
  ai_show_sources?: boolean;
};

export default function AiSettingsToggle({ flags, settings }: Props) {
  // Manual test note: after changing settings, do a hard refresh if SSR cache shows stale values.
  const [widgetEnabled, setWidgetEnabled] = useState(flags.ai_widget_enabled);
  const [personalEnabled, setPersonalEnabled] = useState(flags.ai_personal_enabled);
  const [localSettings, setLocalSettings] = useState(settings);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyUpdate = async (patch: UpdatePayload, endpoint = "/api/admin/ai-settings") => {
    if (pending) return;
    const prevFlags = { widgetEnabled, personalEnabled };
    const prevSettings = localSettings;
    if (typeof patch.ai_widget_enabled === "boolean") {
      setWidgetEnabled(patch.ai_widget_enabled);
    }
    if (typeof patch.ai_personal_enabled === "boolean") {
      setPersonalEnabled(patch.ai_personal_enabled);
    }
    if (
      typeof patch.strictMode === "boolean" ||
      typeof patch.verbosity === "string" ||
      typeof patch.citations === "boolean" ||
      typeof patch.temperature === "string"
    ) {
      setLocalSettings((current) => ({ ...current, ...patch }));
    }
    setError(null);
    setPending(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        flags?: FeatureFlags;
        settings?: AiSettings;
      };
      if (!res.ok || !data.ok) {
        throw new Error("Save failed");
      }
      if (data.flags) {
        setWidgetEnabled(data.flags.ai_widget_enabled);
        setPersonalEnabled(data.flags.ai_personal_enabled);
      }
      if (data.settings) {
        setLocalSettings(data.settings);
      }
    } catch {
      setWidgetEnabled(prevFlags.widgetEnabled);
      setPersonalEnabled(prevFlags.personalEnabled);
      setLocalSettings(prevSettings);
      setError("Не удалось сохранить настройку.");
    } finally {
      setPending(false);
    }
  };

  const toggleClass = (value: boolean) =>
    `flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${
      value
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-zinc-200 bg-zinc-50 text-zinc-600"
    } ${pending ? "cursor-not-allowed opacity-60" : "hover:border-[#5E704F]"}`;

  const segmentedClass = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs font-semibold transition ${
      active
        ? "border-[#5E704F] bg-[#5E704F] text-white"
        : "border-zinc-200 bg-white text-zinc-700 hover:border-[#5E704F] hover:text-[#5E704F]"
    } ${pending ? "cursor-not-allowed opacity-60" : ""}`;

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
          <p className="text-sm font-semibold text-zinc-900">Помощник (виджет на сайте)</p>
          <p className="text-xs text-zinc-500">
            Показывает/скрывает кнопку помощника на публичных страницах.
          </p>
          </div>
          <button
            type="button"
            onClick={() => applyUpdate({ ai_widget_enabled: !widgetEnabled })}
            disabled={pending}
            className={toggleClass(widgetEnabled)}
          >
            <span>{widgetEnabled ? "Включен" : "Выключен"}</span>
            <span className="inline-flex h-4 w-7 items-center rounded-full bg-white/70 p-0.5">
              <span
                className={`h-3 w-3 rounded-full transition ${
                  widgetEnabled ? "translate-x-3 bg-emerald-500" : "translate-x-0 bg-zinc-400"
                }`}
              />
            </span>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-zinc-900">
              Расширенный ИИ (личные данные жителей)
            </p>
          <p className="text-xs text-zinc-500">
            По умолчанию выключен. Публичные ответы работают всегда.
          </p>
          </div>
          <button
            type="button"
            onClick={() => applyUpdate({ ai_personal_enabled: !personalEnabled })}
            disabled={pending}
            className={toggleClass(personalEnabled)}
          >
            <span>{personalEnabled ? "Включен" : "Выключен"}</span>
            <span className="inline-flex h-4 w-7 items-center rounded-full bg-white/70 p-0.5">
              <span
                className={`h-3 w-3 rounded-full transition ${
                  personalEnabled ? "translate-x-3 bg-emerald-500" : "translate-x-0 bg-zinc-400"
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <p className="text-sm font-semibold text-zinc-900">Качество ответов</p>
        <div className="mt-3 grid gap-3 text-xs text-zinc-700 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-2">
            <span>Строгий режим</span>
            <button
              type="button"
              onClick={() => applyUpdate({ strictMode: !localSettings.strictMode })}
              disabled={pending}
              className={toggleClass(localSettings.strictMode)}
            >
              <span>{localSettings.strictMode ? "Включен" : "Выключен"}</span>
            </button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>Ссылки и источники</span>
            <button
              type="button"
              onClick={() => applyUpdate({ citations: !localSettings.citations })}
              disabled={pending}
              className={toggleClass(localSettings.citations)}
            >
              <span>{localSettings.citations ? "Включены" : "Выключены"}</span>
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>Длина ответа</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => applyUpdate({ verbosity: "short" })}
                disabled={pending}
                className={segmentedClass(localSettings.verbosity === "short")}
              >
                Коротко
              </button>
              <button
                type="button"
                onClick={() => applyUpdate({ verbosity: "normal" })}
                disabled={pending}
                className={segmentedClass(localSettings.verbosity === "normal")}
              >
                Обычно
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>Температура</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => applyUpdate({ temperature: "low" })}
                disabled={pending}
                className={segmentedClass(localSettings.temperature === "low")}
              >
                Точнее
              </button>
              <button
                type="button"
                onClick={() => applyUpdate({ temperature: "medium" })}
                disabled={pending}
                className={segmentedClass(localSettings.temperature === "medium")}
              >
                Чуть креативнее
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>Стиль ответа</span>
            <div className="flex flex-wrap gap-2">
              {(["short", "normal", "detailed"] as const).map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() =>
                    applyUpdate({ ai_answer_style: style }, "/api/admin/ai-format-settings")
                  }
                  disabled={pending}
                  className={segmentedClass(localSettings.ai_answer_style === style)}
                >
                  {style === "short" ? "Коротко" : style === "detailed" ? "Подробно" : "Нормально"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>Тон</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => applyUpdate({ ai_tone: "official" }, "/api/admin/ai-format-settings")}
                disabled={pending}
                className={segmentedClass(localSettings.ai_tone === "official")}
              >
                Официальный
              </button>
              <button
                type="button"
                onClick={() => applyUpdate({ ai_tone: "simple" }, "/api/admin/ai-format-settings")}
                disabled={pending}
                className={segmentedClass(localSettings.ai_tone === "simple")}
              >
                Простой
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>Источники</span>
            <button
              type="button"
              onClick={() =>
                applyUpdate({ ai_show_sources: !localSettings.ai_show_sources }, "/api/admin/ai-format-settings")
              }
              disabled={pending}
              className={toggleClass(localSettings.ai_show_sources)}
            >
              <span>{localSettings.ai_show_sources ? "Показывать" : "Скрывать"}</span>
            </button>
          </div>
        </div>
      </div>

      {error ? <p className="text-xs text-zinc-500">{error}</p> : null}
    </div>
  );
}
