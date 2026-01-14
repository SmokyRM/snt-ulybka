import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { qaEnabled, QA_COOKIE } from "@/lib/qaScenario";

const ADMIN_VIEW_COOKIE = "admin_view";

/**
 * Server-side reset endpoint that clears ALL QA-related cookies:
 * - qaScenario (QA override)
 * - admin_view (admin view mode)
 * 
 * Uses proper cookie deletion: maxAge=0, expires, same path/domain as setting.
 */
export async function POST() {
  if (!qaEnabled()) {
    return NextResponse.json({ ok: false, error: "QA not enabled" }, { status: 404 });
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

  return NextResponse.json({ ok: true });
}
