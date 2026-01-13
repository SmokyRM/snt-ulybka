"use client";

type Props = {
  className?: string;
};

export default function QaClearButton({ className }: Props) {
  const handleClick = () => {
    if (typeof window === "undefined") return;
    try {
      const keys = [
        "assistant_widget_state",
        "assistantWidgetSize:v1",
        "assistantUiScale:v1",
        "assistantOnboardingSeen:v1",
        "assistantTextSize:v1",
        "prefillAppealText",
        "assistant_history",
      ];
      keys.forEach((key) => {
        window.localStorage.removeItem(key);
        window.sessionStorage.removeItem(key);
      });
      // eslint-disable-next-line no-console
      console.info("QA: локальные состояния очищены");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("qa clear error", err);
    }
  };

  return (
    <button
      type="button"
      data-testid="qa-clear-test-state"
      className={
        className ??
        "rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-800 hover:border-[#5E704F] hover:text-[#5E704F]"
      }
      onClick={handleClick}
    >
      Очистить тестовые состояния
    </button>
  );
}
