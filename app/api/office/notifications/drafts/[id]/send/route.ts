import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { getNotificationDraft, markNotificationDraftSent } from "@/lib/notificationDrafts.store";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const guard = await requirePermission(request, "notifications.send", {
    route: `/api/office/notifications/drafts/${params.id}/send`,
    deniedReason: "notifications.send",
  });
  if (guard instanceof Response) return guard;

  try {
    const existing = getNotificationDraft(params.id);
    if (!existing) {
      return fail(request, "not_found", "Уведомление не найдено", 404);
    }

    if (existing.status !== "approved") {
      return fail(request, "invalid_status", "Уведомление должно быть утверждено перед отправкой", 400);
    }

    // Here we would actually send the notification
    // For now, we just mark it as sent
    const draft = markNotificationDraftSent(params.id);
    if (!draft) {
      return fail(request, "not_found", "Уведомление не найдено", 404);
    }
    return ok(request, { draft, sent: true });
  } catch (error) {
    return serverError(request, "Ошибка отправки уведомления", error);
  }
}
