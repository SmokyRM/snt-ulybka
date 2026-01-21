import { ok, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { listAppeals } from "@/server/services/appeals";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const q = searchParams.get("q") || undefined;
    const assignedTo = searchParams.get("assignedTo") || undefined;

    const appeals = await listAppeals({
      status: status === "new" || status === "in_progress" || status === "needs_info" || status === "closed" ? status : undefined,
      q,
      assignedTo,
    });
    return ok(request, { appeals });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return unauthorized(request);
      }
      if (error.message === "FORBIDDEN") {
        return forbidden(request);
      }
    }
    return serverError(request, "Ошибка при получении обращений", error);
  }
}
