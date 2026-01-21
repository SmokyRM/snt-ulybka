"use client";

import { useEffect, useMemo, useState } from "react";
import { OnboardingFrame } from "../../../cabinet/_components/OnboardingFrame";
import type { OnboardingDraft } from "../../../cabinet/_components/onboardingState";
import { readOk } from "@/lib/api/client";

const debounceMs = 600;
const isDev = process.env.NODE_ENV !== "production";

type Status = "idle" | "saving" | "saved" | "error";

export default function ProfileForm({ initialDraft }: { initialDraft: OnboardingDraft }) {
  const [fullName, setFullName] = useState(initialDraft.profile?.fullName ?? "");
  const [phone, setPhone] = useState(initialDraft.profile?.phone ?? "");
  const [status, setStatus] = useState<Status>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const isValid = useMemo(() => fullName.trim().length > 1 && phone.trim().length > 5, [fullName, phone]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStatus("saving");
      setSaveError(null);
      try {
        const res = await fetch("/api/cabinet/onboarding/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draft: { profile: { fullName, phone } }, step: "profile" }),
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
  }, [fullName, phone]);

  return (
    <OnboardingFrame
      step="profile"
      title="Контактные данные"
      nextHref="/cabinet/onboarding/plots"
      nextStage="plots"
      exitHref="/cabinet"
      disableNext={!isValid}
    >
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-zinc-800">
          ФИО
          <input
            name="fullName"
            required
            placeholder="Иванов Иван"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </label>
        <label className="block text-sm font-semibold text-zinc-800">
          Телефон
          <input
            name="phone"
            required
            placeholder="+7 900 000-00-00"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
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
