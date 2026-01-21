import { OnboardingFrame } from "../../../../cabinet/_components/OnboardingFrame";
import { readOnboardingStateFromCookies } from "../../../../cabinet/_components/onboardingState";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function OnboardingDonePage() {
  const state = await readOnboardingStateFromCookies();
  const alreadyCompleted = state.completed || state.step === "cabinet_home";
  if (alreadyCompleted) {
    redirect("/cabinet");
  }

  return (
    <OnboardingFrame
      step="done"
      title="Готово!"
      backHref="/cabinet/onboarding/consent"
      nextHref="/cabinet"
      nextStage="cabinet_home"
      nextLabel="В кабинет"
      exitHref="/cabinet"
    >
      <div className="space-y-3 text-sm text-zinc-800">
        <p>Регистрация завершена. Мы настроили доступ к вашему кабинету.</p>
        <p>Перейдите в кабинет, чтобы увидеть данные по участку, платежам и обращениям.</p>
      </div>
    </OnboardingFrame>
  );
}
