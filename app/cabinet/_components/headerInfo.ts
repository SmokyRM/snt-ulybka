import { getSessionUser } from "@/lib/session.server";
import { getUserProfile } from "@/lib/userProfiles";
import { getUserPlots } from "@/lib/plots";
import { getMembershipStatus } from "@/lib/membership";
import { mapQaStageToPath, type QaCabinetStage } from "@/lib/qaCabinetStage.shared";
import { getQaCabinetStageFromCookies, readQaCabinetMockEnabled } from "@/lib/qaCabinetStage.server";
import { getQaCabinetMockData } from "../_dev/qaMockData";
import { readOnboardingStateFromCookies } from "./onboardingState";

const REG_STAGES: QaCabinetStage[] = ["profile", "plots", "consent"];
const REG_TOTAL = REG_STAGES.length;

type HeaderInfo = {
  title: string;
  statusLine: string;
  progressLabel: string | null;
  progressHref: string | null;
};

const fallbackStatus = "Статус: активный житель";

export async function getCabinetHeaderInfo(title: string): Promise<HeaderInfo> {
  const user = await getSessionUser();
  if (!user) {
    return {
      title,
      statusLine: "Гость",
      progressLabel: null,
      progressHref: "/login?next=/cabinet",
    };
  }

  const mockEnabled = await readQaCabinetMockEnabled();
  if (mockEnabled) {
    const mock = getQaCabinetMockData();
    const plot = mock.userPlots[0];
    const stage = await getQaCabinetStageFromCookies();
    const status = plot ? `Участок: ${plot.street} ${plot.plotNumber}` : fallbackStatus;
    const progress = stage && REG_STAGES.includes(stage)
      ? {
          progressLabel: `Регистрация: шаг ${REG_STAGES.indexOf(stage) + 1} из ${REG_TOTAL}`,
          progressHref: mapQaStageToPath(stage) ?? "/cabinet",
        }
      : { progressLabel: null, progressHref: null };
    return {
      title,
      statusLine: status,
      progressLabel: progress.progressLabel,
      progressHref: progress.progressHref,
    };
  }

  const [profile, plots, membership] = await Promise.all([
    getUserProfile(user.id ?? ""),
    getUserPlots(user.id ?? ""),
    getMembershipStatus(user.id ?? ""),
  ]);

  const plot = plots.find((p) => p.linkStatus === "active") || plots[0];
  const profileComplete = Boolean(profile.fullName && profile.phone);
  const hasPlots = plots.length > 0;
  const isMember = membership.status === "member";

  let stage: QaCabinetStage | null = null;
  if (!profileComplete) stage = "profile";
  else if (!hasPlots) stage = "plots";
  else if (!isMember) stage = "consent";

  const statusLine = plot
    ? `Участок: ${plot.street} ${plot.plotNumber}`
    : profileComplete
      ? "Статус: активный житель"
      : "Регистрация не завершена";

  const cookieState = await readOnboardingStateFromCookies();
  const stateStage = cookieState?.step;
  const completed = cookieState?.completed || stateStage === "cabinet_home";
  const derivedStage =
    completed
      ? null
      : stateStage && REG_STAGES.includes(stateStage as QaCabinetStage)
        ? (stateStage as QaCabinetStage)
        : stage;
  const progress =
    derivedStage && REG_STAGES.includes(derivedStage)
      ? {
          progressLabel: `Регистрация: шаг ${REG_STAGES.indexOf(derivedStage) + 1} из ${REG_TOTAL}`,
          progressHref: mapQaStageToPath(derivedStage) ?? "/cabinet",
        }
      : { progressLabel: null, progressHref: null };

  return {
    title,
    statusLine: completed ? "Статус: активный житель" : statusLine,
    progressLabel: progress.progressLabel,
    progressHref: progress.progressHref,
  };
}
