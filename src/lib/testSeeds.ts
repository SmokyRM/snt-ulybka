import { upsertUserById } from "@/lib/mockDb";
import { upsertUserProfileByAdmin } from "@/lib/userProfiles";
import { setMembershipStatusForUser } from "@/lib/membership";
import { setUserPlot, upsertPlot } from "@/lib/plots";

export const TEST_USER_IDS = {
  empty: "test_user_empty",
  pending: "test_user_pending",
  verified: "test_user_verified",
} as const;

export async function ensureTestUsers() {
  const emptyId = TEST_USER_IDS.empty;
  const pendingId = TEST_USER_IDS.pending;
  const verifiedId = TEST_USER_IDS.verified;

  upsertUserById({ id: emptyId, fullName: "", phone: "", role: "user", status: "pending" });
  upsertUserById({ id: pendingId, fullName: "Ирина Петрова", phone: "+7 912 000-00-11", role: "user", status: "pending" });
  upsertUserById({ id: verifiedId, fullName: "Сергей Иванов", phone: "+7 912 000-00-22", role: "user", status: "verified" });

  await upsertUserProfileByAdmin(emptyId, { fullName: "", phone: "", cadastralNumbers: [] });
  await upsertUserProfileByAdmin(pendingId, { fullName: "Ирина Петрова", phone: "+7 912 000-00-11", cadastralNumbers: [] });
  await upsertUserProfileByAdmin(verifiedId, {
    fullName: "Сергей Иванов",
    phone: "+7 912 000-00-22",
    cadastralNumbers: ["74:00:0000000:1234"],
  });

  await setMembershipStatusForUser({ userId: emptyId, status: "unknown", updatedBy: "system" });
  await setMembershipStatusForUser({ userId: pendingId, status: "pending", updatedBy: "system" });
  await setMembershipStatusForUser({ userId: verifiedId, status: "member", updatedBy: "admin" });

  const plot = await upsertPlot({
    street: "Березовая",
    plotNumber: "12",
    displayName: "Березовая, участок 12",
    cadastral: "74:00:0000000:1234",
    notes: "Тестовый участок",
    ownerUserId: verifiedId,
    status: "VERIFIED",
    verifiedAt: new Date().toISOString(),
    verifiedByUserId: "admin",
  });

  if (plot) {
    await setUserPlot({
      userId: verifiedId,
      plotId: plot.plotId,
      status: "active",
      ownershipStatus: "verified",
      ownershipProof: {
        type: "other",
        note: "Тестовый профиль",
        verifiedAt: new Date().toISOString(),
        verifiedBy: "admin",
      },
      role: "OWNER",
    });
  }

  return { emptyId, pendingId, verifiedId };
}
