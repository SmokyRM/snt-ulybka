import { readOnboardingStateFromCookies } from "../../../../cabinet/_components/onboardingState";
import PlotsForm from "../PlotsForm";

export const dynamic = "force-dynamic";

export default async function OnboardingPlotsPage() {
  const state = await readOnboardingStateFromCookies();
  return <PlotsForm initialDraft={state.draft} />;
}
