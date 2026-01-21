import { redirect } from "next/navigation";
import { readOnboardingStateFromCookies, mapStepToPath } from "../../../cabinet/_components/onboardingState";
import { getQaCabinetStageFromCookies } from "@/lib/qaCabinetStage.server";

export const dynamic = "force-dynamic";

export default async function CabinetOnboardingIndex() {
  const { step, completed } = await readOnboardingStateFromCookies();
  if (completed) {
    redirect("/cabinet");
  }
  const qaStage = await getQaCabinetStageFromCookies();
  if (qaStage === "cabinet_home") {
    redirect("/cabinet");
  }
  const target = mapStepToPath(step);
  redirect(target);
}
