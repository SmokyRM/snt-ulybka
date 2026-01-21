import { ok, serverError } from "@/lib/api/respond";
import { getSessionUser } from "@/lib/session.server";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return ok(request, { authenticated: false });
    }
    return ok(request, {
      authenticated: true,
      user: {
        id: user.id ?? null,
        role: user.role,
        contact: user.contact ?? null,
      },
    });
  } catch (error) {
    return serverError(request, "Ошибка при получении информации о пользователе", error);
  }
}

