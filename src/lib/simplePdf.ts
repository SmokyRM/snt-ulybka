const escapePdfText = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

export function createSimplePdf(pages: string[][]): Buffer {
  let pdf = "%PDF-1.4\n";
  const objects: string[] = [];
  const offsets: number[] = [];

  // Catalog
  objects.push("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n");

  // Pages (kids filled later)
  const kids: string[] = [];

  pages.forEach((lines, idx) => {
    const pageNum = 3 + idx * 2;
    const contentNum = pageNum + 1;
    kids.push(`${pageNum} 0 R`);

    const contentOps: string[] = ["BT", "/F1 12 Tf", "50 780 Td"];
    lines.forEach((line, lineIdx) => {
      if (lineIdx > 0) contentOps.push("0 -16 Td");
      contentOps.push(`(${escapePdfText(line)}) Tj`);
    });
    contentOps.push("ET");
    const contentStream = contentOps.join("\n");
    const contentObj = `${contentNum} 0 obj << /Length ${Buffer.byteLength(contentStream, "utf8")} >> stream\n${contentStream}\nendstream\nendobj\n`;
    objects.push(contentObj);

    const pageObj = `${pageNum} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> /Contents ${contentNum} 0 R >> endobj\n`;
    objects.push(pageObj);
  });

  // Pages object with kids list
  const pagesObj = `2 0 obj << /Type /Pages /Kids [${kids.join(" ")}] /Count ${pages.length} >> endobj\n`;
  objects.splice(1, 0, pagesObj);

  // Build with xref
  objects.forEach((obj) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += obj;
  });

  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((off) => {
    pdf += `${off.toString().padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}
