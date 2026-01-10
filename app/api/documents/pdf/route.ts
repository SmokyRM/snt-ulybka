import { NextResponse } from "next/server";
import { fillTemplate, getTemplateBySlug, getTemplateContext } from "@/lib/templates";

const buildPdf = (text: string) => {
  const lines = text.split("\n").map((line) => line.replace(/\(/g, "\\(").replace(/\)/g, "\\)"));
  const content = [
    "BT",
    "/F1 12 Tf",
    "50 760 Td",
    lines.map((line, idx) => `${idx === 0 ? "" : "0 -16 Td"}(${line}) Tj`).join("\n"),
    "ET",
  ].join("\n");
  const stream = content;
  const length = Buffer.byteLength(stream, "utf8");
  const pdfParts = [
    "%PDF-1.4",
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
    `4 0 obj << /Length ${length} >> stream`,
    stream,
    "endstream endobj",
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    "xref",
    "0 6",
    "0000000000 65535 f ",
    "0000000010 00000 n ",
    "0000000063 00000 n ",
    "0000000124 00000 n ",
    `0000000271 00000 n `,
    "0000000000 00000 n ",
    "trailer << /Size 6 /Root 1 0 R >>",
    "startxref",
    "400",
    "%%EOF",
  ].join("\n");
  return pdfParts;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("template");
  if (!slug) {
    return NextResponse.json({ error: "template is required" }, { status: 400 });
  }
  const template = await getTemplateBySlug(slug);
  if (!template) {
    return NextResponse.json({ error: "template not found" }, { status: 404 });
  }
  const ctx = await getTemplateContext();
  const filled = fillTemplate(template.content, ctx);
  const pdf = buildPdf(filled);
  return new NextResponse(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slug}.pdf"`,
    },
  });
}
