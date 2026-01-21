import { getSessionUser } from "@/lib/session.server";
import { createAiEvent } from "@/lib/mockDb";
import { fail, ok, serverError } from "@/lib/api/respond";

export async function POST(request: Request) {
  // No auth required - events can be logged by anyone (including guests)
  // But we'll try to get user info if available
  const user = await getSessionUser();
  
  let body: {
    eventType: "assistant_opened" | "question_asked" | "answer_shown";
    route?: string | null;
    role?: string | null;
    meta?: Record<string, unknown> | null;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail(request, "validation_error", "invalid json", 400);
  }

  if (!body.eventType) {
    return fail(request, "validation_error", "eventType is required", 400);
  }

  try {
    const event = createAiEvent({
      userId: user?.id || null,
      role: body.role || user?.role || null,
      route: body.route || null,
      eventType: body.eventType,
      meta: body.meta || null,
    });

    return ok(request, { event });
  } catch (e) {
    return serverError(request, "Internal error", e);
  }
}
