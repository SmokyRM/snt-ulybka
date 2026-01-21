import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { getRequestId } from "@/lib/api/requestId";
import { getSessionUser } from "@/lib/session.server";

const SESSION_COOKIE = "snt_session";

export async function POST(request: Request) {
  const startTime = Date.now();
  const requestId = getRequestId(request);
  const pathname = new URL(request.url).pathname;
  
  // Получаем пользователя до удаления сессии для логирования
  const user = await getSessionUser().catch(() => null);
  const role = user?.role ?? null;
  const userId = user?.id ?? null;
  
  const cookieStore = await Promise.resolve(cookies());
  cookieStore.set(SESSION_COOKIE, "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  
  const latencyMs = Date.now() - startTime;
  logAuthEvent({
    action: "logout",
    path: pathname,
    role,
    userId,
    status: 200,
    latencyMs,
    requestId,
    message: "Logout successful",
  });
  
  return NextResponse.json({ ok: true });
}
