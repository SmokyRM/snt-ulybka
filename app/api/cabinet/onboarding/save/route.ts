import { ok, serverError } from "@/lib/api/respond";
import { readOnboardingStateFromCookies, writeOnboardingStateToCookies } from "../../../../cabinet/_components/onboardingState";
import type { OnboardingDraft } from "../../../../cabinet/_components/onboardingState";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const incomingDraft = (body?.draft ?? {}) as Partial<OnboardingDraft>;
    const step = body?.step as string | undefined;
    const current = await readOnboardingStateFromCookies();
    const merged: OnboardingDraft = {
      profile: { ...current.draft.profile, ...(incomingDraft.profile || {}) },
      plots: Array.isArray(incomingDraft.plots) ? incomingDraft.plots : current.draft.plots,
      consent: { ...current.draft.consent, ...(incomingDraft.consent || {}) },
      noPlot: incomingDraft.noPlot ?? current.draft.noPlot,
      completed: incomingDraft.completed ?? current.draft.completed,
    };
    const normalizedStep =
      step === "profile" || step === "plots" || step === "consent" || step === "cabinet_home"
        ? step
        : undefined;

    await writeOnboardingStateToCookies(merged, normalizedStep);
    const updated = await readOnboardingStateFromCookies();
    return ok(request, updated);
  } catch (error) {
    return serverError(request, "Ошибка при сохранении состояния онбординга", error);
  }
}
