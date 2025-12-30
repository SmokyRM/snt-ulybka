export type PlotStatusCode = "DRAFT" | "INVITE_READY" | "CLAIMED" | "VERIFIED";

const LABELS: Record<PlotStatusCode, string> = {
  DRAFT: "Не оформлен",
  INVITE_READY: "Ожидает приглашения",
  CLAIMED: "Ожидает подтверждения",
  VERIFIED: "Подтверждён",
};

export const plotStatusLabel = (status?: string | null): string => {
  if (!status) return "—";
  if (status in LABELS) return LABELS[status as PlotStatusCode];
  return status;
};
