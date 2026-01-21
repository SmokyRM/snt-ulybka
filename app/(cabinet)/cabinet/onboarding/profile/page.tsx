import { readOnboardingStateFromCookies } from "../../../../cabinet/_components/onboardingState";
import ProfileForm from "../ProfileForm";

export const dynamic = "force-dynamic";

export default async function OnboardingProfilePage() {
  const state = await readOnboardingStateFromCookies();
  return <ProfileForm initialDraft={state.draft} />;
}
