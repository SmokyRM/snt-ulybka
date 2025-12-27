"use server";

import { redirect } from "next/navigation";
import { findUserByContact, findUserById } from "@/lib/mockDb";
import { getSessionPayload, isAdminPayload, updateSessionPayload } from "@/lib/session.server";
import { ensureTestUsers } from "@/lib/testSeeds";

export async function startImpersonation(formData: FormData) {
  const payload = await getSessionPayload();
  if (!isAdminPayload(payload)) {
    redirect("/login");
  }

  const rawUserId = (formData.get("userId") as string | null)?.trim();
  const rawContact = (formData.get("contact") as string | null)?.trim();

  const target =
    (rawUserId ? findUserById(rawUserId) : null) ||
    (rawContact ? findUserByContact(rawContact) : null);

  if (!target) {
    redirect("/admin?impersonation=not_found");
  }

  const adminId = payload?.userId ?? "admin";
  await updateSessionPayload({
    impersonateUserId: target.id,
    impersonatorAdminId: adminId,
  });

  redirect("/cabinet");
}

export async function stopImpersonation() {
  const payload = await getSessionPayload();
  if (!isAdminPayload(payload)) {
    redirect("/login");
  }
  await updateSessionPayload({
    impersonateUserId: undefined,
    impersonatorAdminId: undefined,
  });
  redirect("/admin");
}

export async function startTestScenario(formData: FormData) {
  const payload = await getSessionPayload();
  if (!isAdminPayload(payload)) {
    redirect("/login");
  }
  if (process.env.NODE_ENV !== "development") {
    redirect("/admin?impersonation=disabled");
  }

  const scenario = (formData.get("scenario") as string | null)?.trim();
  const { emptyId, pendingId, verifiedId } = await ensureTestUsers();

  let targetId: string | null = null;
  switch (scenario) {
    case "empty":
      targetId = emptyId;
      break;
    case "pending":
      targetId = pendingId;
      break;
    case "verified":
      targetId = verifiedId;
      break;
    default:
      targetId = null;
  }

  if (!targetId) {
    redirect("/admin?impersonation=invalid_scenario");
  }

  const adminId = payload?.userId ?? "admin";
  await updateSessionPayload({
    impersonateUserId: targetId,
    impersonatorAdminId: adminId,
  });

  redirect("/cabinet");
}
