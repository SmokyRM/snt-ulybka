import { ok, methodNotAllowed, serverError } from "@/lib/api/respond";

export async function GET(request: Request) {
  try {
    const now = new Date().toISOString();

    // Версию и коммит берём только из не секретных env
    const version = process.env.NEXT_PUBLIC_APP_VERSION;
    const commit = process.env.GIT_SHA;

    return ok(request, {
      ok: true,
      time: now,
      version: version || undefined,
      commit: commit || undefined,
    });
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

