import { qaEnabled } from "@/lib/qaScenario";
import { writeQaScenarioCookie } from "@/lib/qaScenario.server";
import { verifySameOrigin } from "@/lib/security/verifySameOrigin";
import { rateLimit, buildRateLimitHeaders } from "@/lib/security/rateLimit";
import { fail, forbidden, methodNotAllowed, ok, serverError } from "@/lib/api/respond";

export async function POST(request: Request) {
  try {
    // Fail-closed: проверка метода
    if (request.method !== "POST") {
      return methodNotAllowed(request, ["POST"]);
    }

    // Fail-closed: только dev + ENABLE_QA
    if (!qaEnabled()) {
      return fail(request, "not_found", "not_found", 404);
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
    const rateLimitResult = await rateLimit(`qa-clear-${clientId}`, 2, 1000); // 2 requests per second
    if (!rateLimitResult.ok) {
      return fail(
        request,
        "rate_limited",
        "Превышен лимит запросов. Попробуйте позже.",
        429,
        undefined,
        { headers: buildRateLimitHeaders(rateLimitResult) }
      );
    }

    await writeQaScenarioCookie(null);
    return ok(request, {});
  } catch (error) {
    return serverError(request, "Internal server error", error);
  }
}
