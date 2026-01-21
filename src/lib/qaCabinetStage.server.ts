import "server-only";
import { cookies } from "next/headers";
import { QA_CABINET_STAGE_COOKIE, QA_CABINET_MOCK_COOKIE, QA_CABINET_STAGES, type QaCabinetStage } from "./qaCabinetStage.shared";

const STAGE_SET = new Set<string>(QA_CABINET_STAGES);

export const getQaCabinetStageFromCookies = async (): Promise<QaCabinetStage | null> => {
  const qaEnabled = process.env.ENABLE_QA === "true";
  if (process.env.NODE_ENV === "production" || !qaEnabled) return null;
  const store = await Promise.resolve(cookies());
  const value = store.get(QA_CABINET_STAGE_COOKIE)?.value ?? null;
  if (!value || !STAGE_SET.has(value)) return null;
  return value as QaCabinetStage;
};

export const readQaCabinetMockEnabled = async (): Promise<boolean> => {
  const qaEnabled = process.env.ENABLE_QA === "true";
  if (process.env.NODE_ENV === "production" || !qaEnabled) return false;
  const store = await Promise.resolve(cookies());
  const value = store.get(QA_CABINET_MOCK_COOKIE)?.value ?? null;
  return value === "1" || value === "true";
};
