import { NextResponse } from "next/server";
import { upsertUserById } from "@/lib/mockDb";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { getRequestId } from "@/lib/api/requestId";

const SESSION_COOKIE = "snt_session";

const ROLE_USER_IDS: Record<string, string> = {
  resident: "user-resident-default",
};

export async function POST(request: Request) {
  const startTime = Date.now();
  const requestId = getRequestId(request);
  const pathname = new URL(request.url).pathname;

  // Проверяем, что это dev/qa окружение
  const isDev = process.env.NODE_ENV === "development";
  const isQa = process.env.ENABLE_QA === "true";
  
  if (!isDev && !isQa) {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const scenario = (body.scenario as string | undefined)?.trim() || "resident";

  // Валидируем scenario (опционально, для будущего расширения)
  const validScenarios = ["resident", "resident_ok", "resident_debtor"];
  if (!validScenarios.includes(scenario)) {
    return NextResponse.json({ error: "Invalid scenario" }, { status: 400 });
  }

  const role = "resident";
  const userId = ROLE_USER_IDS[role];
  
  if (!userId) {
    const latencyMs = Date.now() - startTime;
  logAuthEvent({
    action: "login",
    path: pathname,
    role: null,
    userId: null,
    status: 500,
    latencyMs,
    requestId,
    message: "Resident user ID not configured (QA)",
  });
    return NextResponse.json({ error: "Configuration error" }, { status: 500 });
  }

  // Создаём пользователя в БД
  upsertUserById({ id: userId, role });

  // Формируем payload сессии
  const payload = JSON.stringify({ role, userId });

  const response = NextResponse.json({
    ok: true,
    role,
    userId,
    scenario,
  });

  // Устанавливаем cookie
  response.cookies.set(SESSION_COOKIE, payload, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 7 дней
  });

  const latencyMs = Date.now() - startTime;
  logAuthEvent({
    action: "login",
    path: pathname,
    role,
    userId,
    status: 200,
    latencyMs,
    requestId,
    message: "Resident login successful (QA)",
  });

  return response;
}
