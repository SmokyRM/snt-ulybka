export const QA_CABINET_STAGE_COOKIE = "qa_cabinet_stage";
export const QA_CABINET_MOCK_COOKIE = "qa_cabinet_mock";

export type QaCabinetStage =
  | "guest"
  | "profile"
  | "plots"
  | "consent"
  | "cabinet_home"
  | "cabinet_payments"
  | "cabinet_power"
  | "cabinet_appeals"
  | "cabinet_docs"
  | "cabinet_help";

export const QA_CABINET_STAGES: QaCabinetStage[] = [
  "guest",
  "profile",
  "plots",
  "consent",
  "cabinet_home",
  "cabinet_payments",
  "cabinet_power",
  "cabinet_appeals",
  "cabinet_docs",
  "cabinet_help",
];

export const STAGE_TO_URL: Record<QaCabinetStage, string> = {
  guest: "/login?next=/cabinet",
  profile: "/cabinet/onboarding/profile",
  plots: "/cabinet/onboarding/plots",
  consent: "/cabinet/onboarding/consent",
  cabinet_home: "/cabinet",
  cabinet_payments: "/cabinet/payments",
  cabinet_power: "/cabinet/power",
  cabinet_appeals: "/cabinet/appeals",
  cabinet_docs: "/cabinet/docs",
  cabinet_help: "/cabinet/help",
};

export const mapQaStageToPath = (stage: QaCabinetStage): string | null => {
  return STAGE_TO_URL[stage] ?? null;
};
