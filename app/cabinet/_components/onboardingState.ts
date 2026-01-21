import { cookies } from "next/headers";
import { mapQaStageToPath, type QaCabinetStage } from "@/lib/qaCabinetStage.shared";
import { readQaCabinetMockEnabled } from "@/lib/qaCabinetStage.server";

export type OnboardingDraft = {
  profile?: { fullName?: string; phone?: string };
  plots?: Array<{
    id: string;
    plotNumber?: string;
    cadastral?: string;
    addressLine?: string;
    isPrimary?: boolean;
  }>;
  noPlot?: boolean;
  consent?: { accepted?: boolean; notifications?: boolean };
  completed?: boolean;
};

export type OnboardingState = {
  draft: OnboardingDraft;
  step: QaCabinetStage | "cabinet_home";
  completed: boolean;
};

export const QA_ONBOARDING_DRAFT_COOKIE = "qa_onboarding_draft";
export const QA_ONBOARDING_STEP_COOKIE = "qa_onboarding_step";

const computeStepFromDraft = (draft: OnboardingDraft): QaCabinetStage | "cabinet_home" => {
  if (!draft?.profile?.fullName || !draft?.profile?.phone) return "profile";
  const hasPlots = Array.isArray(draft.plots) && draft.plots.length > 0;
  if (!hasPlots && !draft.noPlot) return "plots";
  if (!draft?.consent?.accepted) return "consent";
  return "cabinet_home";
};

export async function readOnboardingStateFromCookies(): Promise<OnboardingState> {
  const store = await cookies();
  const draftRaw = store.get(QA_ONBOARDING_DRAFT_COOKIE)?.value ?? null;
  let draft: OnboardingDraft = {};
  try {
    draft = draftRaw ? (JSON.parse(draftRaw) as OnboardingDraft) : {};
  } catch {
    draft = {};
  }
  const mockEnabled = await readQaCabinetMockEnabled();
  if (mockEnabled && (!draft.plots || draft.plots.length === 0)) {
    draft.plots = [
      { id: "mock-plot-1", plotNumber: "12", cadastral: "66:12:345678:12", addressLine: "Центральная, 12", isPrimary: true },
      { id: "mock-plot-2", plotNumber: "14", cadastral: "66:12:345678:14", addressLine: "Центральная, 14", isPrimary: false },
    ];
  }
  const stepFromCookie = store.get(QA_ONBOARDING_STEP_COOKIE)?.value as QaCabinetStage | "cabinet_home" | undefined;
  const computed = computeStepFromDraft(draft);
  const step = stepFromCookie ?? computed;
  const completed = step === "cabinet_home";
  return { draft, step, completed };
}

export async function writeOnboardingStateToCookies(draft: OnboardingDraft, step?: QaCabinetStage | "cabinet_home") {
  const store = await cookies();
  const nextStep = step ?? computeStepFromDraft(draft);
  store.set(QA_ONBOARDING_DRAFT_COOKIE, JSON.stringify(draft), {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });
  store.set(QA_ONBOARDING_STEP_COOKIE, nextStep, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function mapStepToPath(step: QaCabinetStage | "cabinet_home"): string {
  const mapped = mapQaStageToPath(step as QaCabinetStage);
  if (mapped) return mapped;
  if (step === "cabinet_home") return "/cabinet";
  return "/cabinet/onboarding/profile";
}
