import { NextResponse } from "next/server";
<<<<<<< HEAD
import { cookies } from "next/headers";
import { qaEnabled, QA_COOKIE } from "@/lib/qaScenario";

const ADMIN_VIEW_COOKIE = "admin_view";

/**
 * Legacy endpoint for clearing QA scenario.
 * Now also clears admin_view cookie for consistency.
 * Consider using /api/admin/qa/reset instead.
 */
=======
import { qaEnabled } from "@/lib/qaScenario";
import { writeQaScenarioCookie } from "@/lib/qaScenario.server";

>>>>>>> 737c5be (codex snapshot)
export async function POST() {
  if (!qaEnabled()) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
<<<<<<< HEAD
  
  const cookieStore = await cookies();
  
  // Clear QA scenario cookie
  cookieStore.set(QA_COOKIE, "", {
    path: "/",
    maxAge: 0,
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
  });
  
  // Also clear admin_view cookie if it exists
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
  
=======
  await writeQaScenarioCookie(null);
>>>>>>> 737c5be (codex snapshot)
  return NextResponse.json({ ok: true });
}
