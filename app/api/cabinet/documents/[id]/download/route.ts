export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { isResidentRole } from "@/lib/rbac";
import { getOfficeDocumentById } from "@/lib/office/documentsRegistry.store";
import { assertCanAccessOfficeDocument, DocumentAccessNotFoundError } from "@/lib/office/documentAccess.server";
import { readOfficeDocumentBytes } from "@/lib/office/documentDownload.server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Params) {
  const session = await getEffectiveSessionUser().catch(() => null);
  if (!session || !isResidentRole(session.role)) {
    return NextResponse.json({ ok: false, error: { code: "not_found", message: "Not found" } }, { status: 404 });
  }

  try {
    const { id } = await context.params;
    const doc = await assertCanAccessOfficeDocument(session, getOfficeDocumentById(id));
    const file = await readOfficeDocumentBytes(doc);
    return new NextResponse(Buffer.from(file.body), {
      status: 200,
      headers: {
        "Content-Type": file.mime,
        "Content-Disposition": `attachment; filename="${file.fileName}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof DocumentAccessNotFoundError) {
      return NextResponse.json({ ok: false, error: { code: "not_found", message: "Not found" } }, { status: 404 });
    }
    return NextResponse.json(
      { ok: false, error: { code: "download_failed", message: "Не удалось выдать файл" } },
      { status: 500 },
    );
  }
}
