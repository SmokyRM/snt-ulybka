import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { qaEnabled, QA_COOKIE } from "@/lib/qaScenario";
import { verifySameOrigin } from "@/lib/security/verifySameOrigin";
import { rateLimit } from "@/lib/security/rateLimit";
import { getRequestId, setRequestIdHeader } from "@/lib/api/requestId";

const ADMIN_VIEW_COOKIE = "admin_view";

/**
 * Server-side reset endpoint that clears ALL QA-related cookies:
 * - qaScenario (QA override)
 * - admin_view (admin view mode)
 * 
 * Uses proper cookie deletion: maxAge=0, expires, same path/domain as setting.
 */
export async function POST(request: Request) {
  const requestId = getRequestId(request);
  
  try {
    // Fail-closed: проверка метода
    if (request.method !== "POST") {
      const response = NextResponse.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
      setRequestIdHeader(response, requestId);
      return response;
    }

    // Fail-closed: только dev + ENABLE_QA
    if (!qaEnabled()) {
      const response = NextResponse.json({ ok: false, error: "QA not enabled" }, { status: 404 });
      setRequestIdHeader(response, requestId);
      return response;
    }

    // CSRF защита
    const originCheck = verifySameOrigin(request);
    if (!originCheck.ok) {
      const response = NextResponse.json(
        { error: "Запрос отклонён по политике безопасности (origin)." },
        { status: 403 }
      );
      setRequestIdHeader(response, requestId);
      return response;
    }

    // Rate limiting (dev-only, для QA endpoints) - 2 req/sec на ip+path
    const clientId = request.headers.get("x-forwarded-for") || 
                     request.headers.get("x-real-ip") || 
                     "unknown";
    const rateLimitResult = rateLimit(`qa-reset-${clientId}`, 2, 1000); // 2 requests per second
    if (!rateLimitResult.ok) {
      const retryAfter = Math.ceil((rateLimitResult.retryAfterMs || 0) / 1000);
      const response = NextResponse.json(
        { error: "Превышен лимит запросов. Попробуйте позже." },
        { 
          status: 429,
          headers: { "Retry-After": String(retryAfter) }
        }
      );
      setRequestIdHeader(response, requestId);
      return response;
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

    const response = NextResponse.json({ ok: true });
    setRequestIdHeader(response, requestId);
    return response;
  } catch (error) {
    const response = NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
    setRequestIdHeader(response, getRequestId(request));
    return response;
  }
}
