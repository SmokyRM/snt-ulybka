import { NextResponse } from "next/server";
import { getSessionUser, hasBillingAccess } from "@/lib/session.server";
import { findBillingImport, listBillingImportErrors } from "@/lib/mockDb";

type ParamsPromise<T> = { params: Promise<T> };

export async function GET(request: Request, { params }: ParamsPromise<{ id: string }>) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasBillingAccess(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const billingImport = findBillingImport(id);
  if (!billingImport) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  if (!type || (type !== "invalid" && type !== "unmatched")) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }

  const errors = listBillingImportErrors(id).filter((error) =>
    type === "invalid" ? error.type === "invalid" : error.type === "unmatched"
  );

  const header = ["rowIndex", "reason", "rawRow"];
  const rows = errors.map((error) => [
    error.rowIndex.toString(),
    error.reason,
    `"${error.rowText.replace(/"/g, '""')}"`,
  ]);

  const csv =
    [header, ...rows]
      .map((cells) => cells.join(","))
      .join("\n") + "\n";
  const filename = `billing-import-${id}-${type}.csv`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
