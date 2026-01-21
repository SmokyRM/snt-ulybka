"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { OnboardingFrame } from "../../../cabinet/_components/OnboardingFrame";
import type { OnboardingDraft } from "../../../cabinet/_components/onboardingState";
import { readOk } from "@/lib/api/client";

const debounceMs = 600;
const isDev = process.env.NODE_ENV !== "production";
type Status = "idle" | "saving" | "saved" | "error";

export default function ConsentForm({ initialDraft }: { initialDraft: OnboardingDraft }) {
  const [accepted, setAccepted] = useState(Boolean(initialDraft.consent?.accepted));
  const [notifications, setNotifications] = useState(Boolean(initialDraft.consent?.notifications));
  const [status, setStatus] = useState<Status>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const isValid = useMemo(() => accepted, [accepted]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStatus("saving");
      setSaveError(null);
      try {
        const res = await fetch("/api/cabinet/onboarding/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            draft: { consent: { accepted, notifications } },
            step: accepted ? "cabinet_home" : "consent",
          }),
          signal: controller.signal,
        });
        if (isDev) {
          const preview = await res.clone().text();
          console.log("[onboarding-save]", { status: res.status, bodyPreview: preview.slice(0, 200) });
        }
        await readOk(res);
        setStatus("saved");
        setSaveError(null);
      } catch (e) {
        setStatus("error");
        setSaveError(e instanceof Error ? e.message : "Ошибка сети или таймаут");
        if (isDev) {
          console.warn("[onboarding-save] fetch failed", e);
        }
      }
    }, debounceMs);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [accepted, notifications]);

  return (
    <OnboardingFrame
      step="consent"
      title="Согласие"
      backHref="/cabinet/onboarding/plots"
      nextHref="/cabinet/onboarding/done"
      nextStage="cabinet_home"
      nextLabel="Подтвердить и закончить"
      exitHref="/cabinet"
      disableNext={!isValid}
    >
      <div className="space-y-3">
        <label className="flex items-start gap-2 text-sm text-zinc-800">
          <input
            type="checkbox"
            required
            className="mt-1"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
          />
          <span>
            Согласен на обработку персональных данных и получение уведомлений от СНТ.
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm text-zinc-800">
          <input
            type="checkbox"
            className="mt-1"
            checked={notifications}
            onChange={(e) => setNotifications(e.target.checked)}
          />
          <span>Хочу получать уведомления и новости (опционально)</span>
        </label>
        <p className="text-xs text-zinc-600">
          Данные используются только для работы СНТ «Улыбка». Вы можете изменить решение позже в настройках безопасности.
        </p>
        <div className="text-xs text-[#5E704F]">
          <Link href="/docs/privacy" className="underline">
            Политика ПДн
          </Link>{" "}
          ·{" "}
          <Link href="/docs/terms" className="underline">
            Пользовательское соглашение
          </Link>
        </div>
        <StatusBadge status={status} saveError={saveError} />
      </div>
    </OnboardingFrame>
  );
}

function StatusBadge({ status, saveError }: { status: Status; saveError?: string | null }) {
  if (status === "saving") return <p className="text-xs text-zinc-500">Сохраняю…</p>;
  if (status === "saved") return <p className="text-xs text-emerald-600">Сохранено</p>;
  if (status === "error") {
    return (
      <p className="text-xs text-rose-600" role="alert">
        Ошибка сохранения{saveError ? `: ${saveError}` : ""}
      </p>
    );
  }
  return null;
}
