import { ok, serverError } from "@/lib/api/respond";
import { readOnboardingStateFromCookies } from "../../../../cabinet/_components/onboardingState";

export async function GET(request: Request) {
  try {
    const state = await readOnboardingStateFromCookies();
    return ok(request, state);
  } catch (error) {
    return serverError(request, "Ошибка при получении состояния онбординга", error);
  }
}
