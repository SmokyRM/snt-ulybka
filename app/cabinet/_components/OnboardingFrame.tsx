import { OnboardingActions } from "./OnboardingActions";

export const ONBOARDING_STEPS = [
  { key: "profile", title: "Профиль" },
  { key: "plots", title: "Участок" },
  { key: "consent", title: "Согласие" },
  { key: "done", title: "Готово" },
] as const;

export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number]["key"];

type Props = {
  step: OnboardingStepKey;
  title: string;
  children: React.ReactNode;
  backHref?: string;
  nextHref?: string;
  exitHref?: string;
  nextStage?: "profile" | "plots" | "consent" | "cabinet_home" | null;
  nextLabel?: string;
  backLabel?: string;
  disableNext?: boolean;
};

export function OnboardingFrame({
  step,
  title,
  children,
  backHref,
  nextHref,
  exitHref = "/cabinet",
  nextStage = null,
  nextLabel,
  backLabel,
  disableNext = false,
}: Props) {
  const total = ONBOARDING_STEPS.length;
  const currentIndex = ONBOARDING_STEPS.findIndex((s) => s.key === step);
  const progressLabel =
    currentIndex >= 0 ? `Шаг ${currentIndex + 1} из ${total}` : `Шаг — из ${total}`;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="space-y-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{progressLabel}</div>
        <h1 className="text-2xl font-semibold text-zinc-900">{title}</h1>
      </div>
      <div className="space-y-4 text-sm text-zinc-800">{children}</div>
      <OnboardingActions
        backHref={backHref}
        nextHref={nextHref}
        exitHref={exitHref}
        nextStage={nextStage}
        nextLabel={nextLabel}
        backLabel={backLabel}
        disableNext={disableNext}
      />
    </div>
  );
}
