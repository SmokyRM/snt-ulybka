import { cookies } from "next/headers";
import { qaEnabled, QA_COOKIE } from "@/lib/qaScenario";
import { verifySameOrigin } from "@/lib/security/verifySameOrigin";
import { rateLimit } from "@/lib/security/rateLimit";
import { fail, forbidden, methodNotAllowed, ok, serverError } from "@/lib/api/respond";

const ADMIN_VIEW_COOKIE = "admin_view";

/**
 * Server-side reset endpoint that clears ALL QA-related cookies:
 * - qaScenario (QA override)
 * - admin_view (admin view mode)
 * 
 * Uses proper cookie deletion: maxAge=0, expires, same path/domain as setting.
 */
export async function POST(request: Request) {
  try {
    // Fail-closed: проверка метода
    if (request.method !== "POST") {
      return methodNotAllowed(request, ["POST"]);
    }

    // Fail-closed: только dev + ENABLE_QA
    if (!qaEnabled()) {
      return fail(request, "not_found", "QA not enabled", 404);
    }

    // CSRF защита
    const originCheck = verifySameOrigin(request);
    if (!originCheck.ok) {
      return forbidden(request, "Запрос отклонён по политике безопасности (origin).");
    }

    // Rate limiting (dev-only, для QA endpoints) - 2 req/sec на ip+path
    const clientId = request.headers.get("x-forwarded-for") || 
                     request.headers.get("x-real-ip") || 
                     "unknown";
    const rateLimitResult = rateLimit(`qa-reset-${clientId}`, 2, 1000); // 2 requests per second
    if (!rateLimitResult.ok) {
      const retryAfter = Math.ceil((rateLimitResult.retryAfterMs || 0) / 1000);
      return fail(
        request,
        "rate_limited",
        "Превышен лимит запросов. Попробуйте позже.",
        429,
        undefined,
        { headers: { "Retry-After": String(retryAfter) } }
      );
    }

    const cookieStore = await cookies();
    
    // Clear QA scenario cookie with same options as setting
    cookieStore.set(QA_COOKIE, "", {
      path: "/",
      maxAge: 0,
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      expires: new Date(0), // Explicit expiration
    });

    // Clear admin_view cookie if it exists
    const adminView = cookieStore.get(ADMIN_VIEW_COOKIE);
    if (adminView) {
      cookieStore.set(ADMIN_VIEW_COOKIE, "", {
        path: "/",
        maxAge: 0,
        httpOnly: false,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        expires: new Date(0),
      });
    }

    return ok(request, {});
  } catch (error) {
    return serverError(request, "Internal server error", error);
  }
}
