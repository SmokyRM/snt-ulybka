export type ElectricityNoticePayload = {
  totalCount: number;
  plots: Array<{ plotNumber: string; street?: string | null }>;
  deadlineText: string;
};

export type NoticeTemplate = "neutral" | "strict" | "friendly";

export function buildElectricityNoticeText(
  payload: ElectricityNoticePayload,
  template: NoticeTemplate = "neutral",
): string {
  const { totalCount, plots, deadlineText } = payload;
  const list =
    plots.length > 0
      ? plots
          .map((p) => {
            const street = p.street ? `${p.street}, ` : "";
            return `${street}участок ${p.plotNumber || "—"}`;
          })
          .join("; ")
      : "—";

  const intro =
    template === "strict"
      ? "Просьба срочно передать показания электросчётчика."
      : template === "friendly"
        ? "Напоминаем о передаче показаний электросчётчика — заранее спасибо!"
        : "Просьба передать показания электросчётчика.";

  return [
    "Уважаемые садоводы!",
    intro,
    `Сейчас не передали: ${totalCount} участков.`,
    `Список: ${list}.`,
    `Срок: ${deadlineText}.`,
    "Спасибо.",
  ].join("\n");
}
