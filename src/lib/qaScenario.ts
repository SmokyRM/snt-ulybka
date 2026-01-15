export type QaScenario =
  | "guest"
  | "resident_ok"
  | "resident_debtor"
  | "admin"
  | "chairman"
  | "accountant"
  | "secretary";

const QA_COOKIE = "qaScenario";

export const qaEnabled = () => {
  // В production доступен только если явно включен через ENABLE_QA
  if (process.env.NODE_ENV === "production") {
    return process.env.ENABLE_QA === "true";
  }
  // В dev/staging всегда доступен
  return true;
};

export { QA_COOKIE };
