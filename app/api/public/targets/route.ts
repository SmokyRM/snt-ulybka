import { ok, serverError } from "@/lib/api/respond";
import { listTargetFundsWithStats } from "@/lib/targets";

export async function GET(request: Request) {
  try {
    const items = listTargetFundsWithStats(true);
    return ok(request, { items });
  } catch (error) {
    return serverError(request, "Ошибка при получении целевых сборов", error);
  }
}
