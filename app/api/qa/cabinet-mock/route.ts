import { QA_CABINET_MOCK_COOKIE } from "@/lib/qaCabinetStage.shared";
import { fail, ok, serverError } from "@/lib/api/respond";

const isDev = process.env.NODE_ENV !== "production";

export async function POST(request: Request) {
  try {
    if (!isDev) {
      return fail(request, "not_found", "not_found", 404);
    }

    const body = await request.json().catch(() => ({}));
    const enabled = Boolean(body?.enabled);

    const response = ok(request, { enabled });

    if (!enabled) {
      response.cookies.set(QA_CABINET_MOCK_COOKIE, "", { path: "/", maxAge: 0 });
      return response;
    }

    response.cookies.set(QA_CABINET_MOCK_COOKIE, "1", {
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
