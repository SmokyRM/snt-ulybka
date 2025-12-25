import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session.server";
import { bulkUpdatePlots } from "@/lib/plotsDb";
import { Plot } from "@/types/snt";

type BulkBody = {
  ids?: string[];
  patch?: {
    isConfirmed?: boolean;
    membershipStatus?: Plot["membershipStatus"];
    clearContacts?: boolean;
  };
};

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as BulkBody;
  const ids = Array.isArray(body.ids) ? body.ids.filter((id) => typeof id === "string") : [];
  const patch = body.patch ?? {};

  if (!ids.length) {
    return NextResponse.json({ error: "Не выбрано ни одного участка" }, { status: 400 });
  }
  if (ids.length > 500) {
    return NextResponse.json({ error: "Слишком много участков за раз (макс. 500)" }, { status: 400 });
  }

  const validMembership =
    patch.membershipStatus === "UNKNOWN" ||
    patch.membershipStatus === "MEMBER" ||
    patch.membershipStatus === "NON_MEMBER" ||
    patch.membershipStatus === undefined;

  if (!validMembership) {
    return NextResponse.json({ error: "Некорректный статус членства" }, { status: 400 });
  }

  const updated = bulkUpdatePlots(ids, patch);

  return NextResponse.json({ updated });
}

