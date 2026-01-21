import { ok, fail, serverError } from "@/lib/api/respond";
import { markInviteCodeAsUsed, validateInviteCode } from "@/lib/registry/core/inviteCodes.store";
import { updatePerson } from "@/lib/registry/core/persons.store";
import { upsertUser } from "@/lib/mockDb";

const SESSION_COOKIE = "snt_session";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      code: string;
      personId: string;
      phone?: string;
      email?: string;
      password: string;
    };

    const { code, personId, phone, email, password } = body;

    if (!code || !personId || !password) {
      return fail(request, "validation_error", "Заполните обязательные поля", 400);
    }

    if (password.length < 6) {
      return fail(request, "validation_error", "Пароль должен быть не менее 6 символов", 400);
    }

    // Validate invite code
    const validation = validateInviteCode(code);
    if (!validation.valid) {
      const message =
        validation.reason === "not_found"
          ? "Код приглашения не найден"
          : validation.reason === "already_used"
            ? "Код приглашения уже был использован"
            : "Код приглашения недействителен";
      return fail(request, "invalid_invite_code", message, 400);
    }

    if (validation.inviteCode!.personId !== personId) {
      return fail(request, "invite_person_mismatch", "Код не соответствует персоне", 400);
    }

    // Create user
    const contact = phone || email;
    if (!contact) {
      return fail(request, "validation_error", "Укажите телефон или email", 400);
    }

    const user = upsertUser({
      contact,
      phone: phone || undefined,
      email: email || undefined,
      status: "pending_verification",
      role: "resident",
      pendingPersonId: personId,
    });

    // Mark invite code as used
    const codeUsed = markInviteCodeAsUsed(code, user.id);
    if (!codeUsed) {
      return fail(request, "code_usage_failed", "Не удалось использовать код", 500);
    }

    // Link user to person
    updatePerson(personId, {
      userId: user.id,
      phone: phone || null,
      email: email || null,
      verificationStatus: "pending",
    });

    // Create session
    const cookiePayload = JSON.stringify({
      userId: user.id,
      contact,
    });

    const response = ok(request, { userId: user.id });
    response.cookies.set(SESSION_COOKIE, cookiePayload, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Registration error:", error);
    return serverError(request, "Ошибка регистрации", error);
  }
}
