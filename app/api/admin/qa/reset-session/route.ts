import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { verifySameOrigin } from "@/lib/security/verifySameOrigin";
import { writeQaScenarioCookie } from "@/lib/qaScenario.server";
import { cookies } from "next/headers";
import { forbidden, ok, serverError } from "@/lib/api/respond";

export async function POST(request: Request) {
  try {
    // RBAC: admin only
    const user = await getSessionUser();
    if (!user || !hasAdminAccess(user)) {
      return forbidden(request, "forbidden");
    }

    // CSRF protection
    const originCheck = verifySameOrigin(request);
    if (!originCheck.ok) {
      return forbidden(request, "origin check failed");
    }

    const cookieStore = await cookies();

    // Clear snt_session cookie
    cookieStore.set("snt_session", "", { path: "/", maxAge: 0 });

    // Clear qa scenario cookie
    await writeQaScenarioCookie(null);

    return ok(request, {});
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
