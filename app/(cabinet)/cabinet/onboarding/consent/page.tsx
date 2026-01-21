import { readOnboardingStateFromCookies } from "../../../../cabinet/_components/onboardingState";
import ConsentForm from "../ConsentForm";

export const dynamic = "force-dynamic";

export default async function OnboardingConsentPage() {
  const state = await readOnboardingStateFromCookies();
  return <ConsentForm initialDraft={state.draft} />;
}
