import { NextResponse } from "next/server";
import { getFile } from "@/lib/fileVault.server";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const file = getFile(params.id);
  if (!file) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const safeName = file.fileName.replace(/[\r\n"']/g, "");
  return new NextResponse(file.bytes as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": file.mimeType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Cache-Control": "no-store",
    },
  });
}
