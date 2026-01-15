import { NextResponse } from "next/server";
import { getSessionUser, hasBillingAccess } from "@/lib/session.server";
import { findBillingImport, listBillingImportErrors, findImportBatch } from "@/lib/mockDb";

type ParamsPromise<T> = { params: Promise<T> };

export async function GET(_request: Request, { params }: ParamsPromise<{ id: string }>) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasBillingAccess(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const billingImport = findBillingImport(id);
  if (!billingImport) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const batch = findImportBatch(billingImport.batchId);
  const errors = listBillingImportErrors(billingImport.id);

  return NextResponse.json({
    ok: true,
    billingImport,
    batchStatus: batch?.status ?? null,
    errors,
  });
}
