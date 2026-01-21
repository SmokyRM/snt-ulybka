import { ok, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { listInbox } from "@/server/services/appeals";
import { checkAndNotifyOverdue } from "@/server/services/notificationsOverdue";
import type { AppealStatus } from "@/lib/office/types";

export async function GET(request: Request) {
  try {
    // Проверяем просроченные обращения и отправляем уведомления (асинхронно, не блокируем)
    checkAndNotifyOverdue().catch((error) => {
      // Игнорируем ошибки проверки overdue (не критично)
      if (process.env.NODE_ENV !== "production") {
        console.error("[inbox] Failed to check overdue:", error);
      }
    });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const scope = searchParams.get("scope");
    const q = searchParams.get("q");

    const params: {
      status?: AppealStatus | "overdue";
      scope?: "mine" | "all";
      q?: string;
    } = {};

    if (status && (status === "new" || status === "in_progress" || status === "needs_info" || status === "closed" || status === "overdue")) {
      params.status = status as AppealStatus | "overdue";
    }
    if (scope === "mine" || scope === "all") {
      params.scope = scope;
    }
    if (q) {
      params.q = q;
    }

    const items = await listInbox(params);
    return ok(request, { items });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return unauthorized(request);
      }
      if (error.message === "FORBIDDEN") {
        return forbidden(request);
      }
    }
    return serverError(request, "Ошибка при получении входящих обращений", error);
  }
}
