export type QaScenario = "guest" | "resident_ok" | "resident_debtor" | "admin";

const QA_COOKIE = "qaScenario";

export const qaEnabled = () =>
  process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_QA_MODE === "1";

export { QA_COOKIE };
