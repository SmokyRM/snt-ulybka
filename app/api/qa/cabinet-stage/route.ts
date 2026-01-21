import { QA_CABINET_STAGE_COOKIE, QA_CABINET_STAGES } from "@/lib/qaCabinetStage.shared";
import { badRequest, fail, ok, serverError } from "@/lib/api/respond";

const isDev = process.env.NODE_ENV !== "production";

export async function POST(request: Request) {
  try {
    if (!isDev) {
      return fail(request, "not_found", "not_found", 404);
    }

    const body = await request.json().catch(() => ({}));
    const stage = body?.stage as string | null | undefined;

    if (stage && !QA_CABINET_STAGES.includes(stage as (typeof QA_CABINET_STAGES)[number])) {
      return badRequest(request, "invalid_stage");
    }

    const response = ok(request, { stage: stage ?? null });

    if (!stage) {
      response.cookies.set(QA_CABINET_STAGE_COOKIE, "", { path: "/", maxAge: 0 });
      return response;
    }

    response.cookies.set(QA_CABINET_STAGE_COOKIE, stage, {
      path: "/",
      sameSite: "lax",
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
