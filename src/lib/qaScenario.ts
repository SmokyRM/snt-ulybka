import { isEnabled } from "@/lib/config/flags";

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
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  return isEnabled("qa_mode");
};

export { QA_COOKIE };
