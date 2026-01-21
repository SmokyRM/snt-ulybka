import { ok, fail, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { saveAppealReplyDraft } from "@/lib/office/appeals.server";
import { hasPermission, isOfficeRole, isStaffOrAdmin } from "@/lib/rbac";
import type { Role } from "@/lib/permissions";

export async function POST(request: Request) {
  try {
    const session = await getEffectiveSessionUser();
    if (!session) return unauthorized(request);
    const role = session.role;
    if (!isStaffOrAdmin(role) || !hasPermission(role as Role, "appeals.manage")) {
      return forbidden(request);
    }

    const body = (await request.json().catch(() => null)) as
      | { id?: string; text?: string; category?: string; tone?: string }
      | null;
    if (!body?.id || !body.text || !body.category || !body.tone) {
      return fail(request, "validation_error", "Отсутствуют обязательные поля", 400);
    }
    const roleForDraft: "chairman" | "secretary" | "accountant" | "admin" | undefined =
      role === "admin" ? "admin" :
      isOfficeRole(role) ? role :
      undefined;
    const updated = saveAppealReplyDraft(body.id, { text: body.text, category: body.category, tone: body.tone }, roleForDraft);
    if (!updated) return fail(request, "not_found", "Обращение не найдено", 404);
    return ok(request, { replyDraft: updated.replyDraft });
  } catch (error) {
    return serverError(request, "Ошибка при сохранении черновика ответа", error);
  }
}
