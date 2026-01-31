import { ok, badRequest, serverError } from "@/lib/api/respond";
import { buildMonthlyAggregates } from "@/lib/office/reporting";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (from && !/^\d{4}-\d{2}$/.test(from)) {
      return badRequest(request, "Неверный формат from");
    }
    if (to && !/^\d{4}-\d{2}$/.test(to)) {
      return badRequest(request, "Неверный формат to");
    }

    const items = buildMonthlyAggregates(from, to);
    return ok(request, { items });
  } catch (error) {
    return serverError(request, "Ошибка формирования отчёта", error);
  }
}
