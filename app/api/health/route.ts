import { ok, serverError } from "@/lib/api/respond";

export async function GET(request: Request) {
  try {
    return ok(request, {});
  } catch (error) {
    return serverError(request, "Ошибка при получении статуса", error);
  }
}
