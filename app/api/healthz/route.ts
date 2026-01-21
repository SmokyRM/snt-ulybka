import { ok, methodNotAllowed, serverError } from "@/lib/api/respond";
import { getDb, getSetting } from "@/lib/mockDb";

/**
 * Проверяет доступность БД через простую операцию чтения
 */
async function checkDatabase(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const startTime = Date.now();
  try {
    // Пробуем прочитать настройки (легковесная операция)
    const db = getDb();
    const testSetting = getSetting("payment_details");
    const latencyMs = Date.now() - startTime;
    
    // Проверяем что БД инициализирована
    if (!db || !testSetting) {
      return { ok: false, latencyMs, error: "Database not initialized" };
    }
    
    return { ok: true, latencyMs };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    return {
      ok: false,
      latencyMs,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Проверяет наличие обязательных env переменных
 */
function checkRequiredEnv(): { ok: boolean; missing: string[] } {
  const required = [
    "NODE_ENV",
    // AUTH переменные опциональны в dev, но должны быть в production
    ...(process.env.NODE_ENV === "production"
      ? ["AUTH_PASS_ADMIN", "AUTH_PASS_CHAIRMAN", "AUTH_PASS_SECRETARY", "AUTH_PASS_ACCOUNTANT"]
      : []),
  ];
  
  const missing = required.filter((key) => {
    const value = process.env[key];
    return !value || value.trim() === "";
  });
  
  return { ok: missing.length === 0, missing };
}

export async function GET(request: Request) {
  try {
    const now = new Date().toISOString();
    const startTime = Date.now();

    // Версию и коммит берём только из не секретных env
    const version = process.env.NEXT_PUBLIC_APP_VERSION;
    const commit = process.env.GIT_SHA;

    // Проверяем компоненты
    const dbCheck = await checkDatabase();
    const envCheck = checkRequiredEnv();
    
    const overallOk = dbCheck.ok && envCheck.ok;
    const latencyMs = Date.now() - startTime;

    const response = {
      healthy: overallOk,
      time: now,
      version: version || undefined,
      commit: commit || undefined,
      uptimeSeconds: Math.round(process.uptime()),
      components: {
        database: {
          ok: dbCheck.ok,
          latencyMs: dbCheck.latencyMs,
          ...(dbCheck.error ? { error: dbCheck.error } : {}),
        },
        environment: {
          ok: envCheck.ok,
          ...(envCheck.missing.length > 0 ? { missing: envCheck.missing } : {}),
        },
      },
      latencyMs,
    };

    // В production возвращаем 503 если компоненты не работают
    const status = overallOk ? 200 : 503;
    return ok(request, response, { status });
  } catch (error) {
    return serverError(request, "Ошибка при получении статуса", error);
  }
}

// Allow-list методов
export async function POST() {
  return methodNotAllowed(new Request("http://localhost"), ["GET"]);
}

export async function PUT() {
  return methodNotAllowed(new Request("http://localhost"), ["GET"]);
}

export async function PATCH() {
  return methodNotAllowed(new Request("http://localhost"), ["GET"]);
}

export async function DELETE() {
  return methodNotAllowed(new Request("http://localhost"), ["GET"]);
}

