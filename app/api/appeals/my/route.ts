import { getUserAppeals } from "@/lib/appeals";
import { getSessionUser } from "@/lib/session.server";
import { ok, serverError, unauthorized } from "@/lib/api/respond";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !user.id) {
      return unauthorized(request);
    }
    const appeals = await getUserAppeals(user.id);
    const unreadCount = appeals.filter((a) => a.unreadByUser).length;
    return ok(request, { appeals, unreadCount });
  } catch (error) {
    return serverError(request, "Ошибка получения обращений", error);
  }
}
