import { badRequest, fail, forbidden, ok, serverError, unauthorized } from "@/lib/api/respond";
import { getSessionUser } from "@/lib/session.server";
import { getAppeal } from "@/lib/appeals.store";
import { evaluateTriage } from "@/server/triage/evaluateTriage";
import type { TriageContext } from "@/server/triage/evaluateTriage";

/**
 * Проверяет, есть ли у пользователя доступ к триажу (admin или chairman)
 */
function hasTriageAccess(user: { role: string } | null | undefined): boolean {
  if (!user) return false;
  const role = user.role;
  return role === "admin" || role === "chairman";
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return unauthorized(request);
  }
  if (!hasTriageAccess(user)) {
    return forbidden(request);
  }

  try {
    const { searchParams } = new URL(request.url);
    const appealId = searchParams.get("appealId");

    if (!appealId) {
      return badRequest(request, "appealId_required");
    }

    // Получаем обращение
    const appeal = getAppeal(appealId);
    if (!appeal) {
      return fail(request, "not_found", "appeal_not_found", 404);
    }

    // Формируем контекст для триажа
    // В будущем здесь можно добавить получение данных о долге из БД
    const ctx: TriageContext = {
      hasDebt: false, // TODO: получить из БД по appeal.authorId или appeal.plotNumber
      debtAmount: 0, // TODO: получить из БД
      channel: "site", // TODO: получить из appeal или других полей
    };

    // Выполняем оценку триажа (dry-run)
    const result = evaluateTriage(appeal, ctx);

    return ok(request, {
      ok: true,
      appealId: appeal.id,
      appeal: {
        id: appeal.id,
        title: appeal.title,
        type: appeal.type,
        priority: appeal.priority,
        status: appeal.status,
      },
      triage: result,
    });
  } catch (error) {
    console.error("Error running triage dry-run:", error);
    return serverError(request, "Ошибка triage dry-run", error);
  }
}
