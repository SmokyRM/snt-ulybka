import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { verifySameOrigin } from "@/lib/security/verifySameOrigin";
import { writeQaScenarioCookie } from "@/lib/qaScenario.server";
import { cookies } from "next/headers";
import { upsertUserById, getMockUserIdByRole } from "@/lib/mockDb";
import { badRequest, forbidden, ok, serverError } from "@/lib/api/respond";

type ImpersonateRole = "guest" | "resident" | "chairman" | "secretary" | "accountant" | "admin";

const ROLE_USER_ID_MAP: Record<ImpersonateRole, string> = {
  guest: "", // No user for guest
  resident: "user-resident-default",
  chairman: "user-chairman-default",
  secretary: "user-secretary-default",
  accountant: "user-accountant-default",
  admin: "user-admin-root",
};

export async function POST(request: Request) {
  try {
    // RBAC: admin only
    const user = await getSessionUser();
    if (!user || !hasAdminAccess(user)) {
      return forbidden(request, "forbidden");
    }

    // CSRF protection
    const originCheck = verifySameOrigin(request);
    if (!originCheck.ok) {
      return forbidden(request, "origin check failed");
    }

    const body = await request.json().catch(() => ({}));
    const roleRaw = (body.role as string | undefined)?.trim();
    const next = (body.next as string | undefined)?.trim() || "/";

    if (!roleRaw) {
      return badRequest(request, "role is required");
    }

    const role: ImpersonateRole | null =
      roleRaw === "guest" ? "guest" :
      roleRaw === "resident" ? "resident" :
      roleRaw === "chairman" ? "chairman" :
      roleRaw === "secretary" ? "secretary" :
      roleRaw === "accountant" ? "accountant" :
      roleRaw === "admin" ? "admin" :
      null;

    if (!role) {
      return badRequest(request, "invalid role");
    }

    // Clear QA scenario cookie to avoid mixed overrides
    await writeQaScenarioCookie(null);

    const cookieStore = await cookies();

    if (role === "guest") {
      // Clear session cookie for guest
      cookieStore.set("snt_session", "", { path: "/", maxAge: 0 });
      return ok(request, { role: "guest", userId: null, next });
    }

    // Get or create mock user for role
    const userId = getMockUserIdByRole(role) || ROLE_USER_ID_MAP[role];
    if (!userId) {
      return serverError(request, "failed to get user id for role");
    }

    // Ensure user exists in mock DB
    upsertUserById({ id: userId, role });

    // Set session cookie with role and userId
    const payload = JSON.stringify({ role, userId });
    cookieStore.set("snt_session", payload, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return ok(request, { role, userId, next });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
