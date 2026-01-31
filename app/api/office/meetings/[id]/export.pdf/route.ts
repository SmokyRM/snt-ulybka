import { NextResponse } from "next/server";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { canManageMeetingMinutes } from "@/lib/meetingMinutesAccess";
import { getMeetingMinutesById } from "@/lib/meetingMinutes";

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

const buildMinutesText = (meeting: Awaited<ReturnType<typeof getMeetingMinutesById>>) => {
  if (!meeting) return "";
  const lines: string[] = [];
  lines.push(`Протокол: ${meeting.title}`);
  lines.push(`Дата: ${meeting.date}`);
  if (meeting.location) lines.push(`Место: ${meeting.location}`);
  if (meeting.attendees) lines.push(`Участники: ${meeting.attendees}`);
  lines.push("");
  lines.push("Повестка:");
  if (meeting.agenda.length === 0) {
    lines.push("- нет");
  } else {
    meeting.agenda.forEach((item, idx) => {
      lines.push(`${idx + 1}. ${item.title}`);
      if (item.presenter) lines.push(`   Докладчик: ${item.presenter}`);
      if (item.notes) lines.push(`   Примечание: ${item.notes}`);
    });
  }
  lines.push("");
  lines.push("Голосования:");
  if (meeting.votes.length === 0) {
    lines.push("- нет");
  } else {
    meeting.votes.forEach((vote, idx) => {
      lines.push(`${idx + 1}. ${vote.question}`);
      vote.options.forEach((opt) => lines.push(`   ${opt.option}: ${opt.votes}`));
      lines.push(`   Итог: ${vote.result}`);
      if (vote.notes) lines.push(`   Примечание: ${vote.notes}`);
    });
  }
  lines.push("");
  lines.push("Решения:");
  if (meeting.decisions.length === 0) {
    lines.push("- нет");
  } else {
    meeting.decisions.forEach((decision, idx) => {
      lines.push(`${idx + 1}. ${decision.title}`);
      if (decision.category) lines.push(`   Категория: ${decision.category}`);
      if (decision.status) lines.push(`   Статус: ${decision.status}`);
      if (decision.outcome) lines.push(`   Итог: ${decision.outcome}`);
      if (decision.responsible) lines.push(`   Ответственный: ${decision.responsible}`);
      if (decision.dueDate) lines.push(`   Срок: ${decision.dueDate}`);
    });
  }
  if (meeting.summary) {
    lines.push("");
    lines.push("Итоги:");
    lines.push(meeting.summary);
  }
  return lines.join("\n");
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getEffectiveSessionUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!canManageMeetingMinutes(user.role)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { id } = await params;
  const meeting = await getMeetingMinutesById(id);
  if (!meeting) {
    return new NextResponse("Not found", { status: 404 });
  }

  const text = buildMinutesText(meeting);
  const pdf = buildPdf(text);
  const filename = `${meeting.title || "protocol"}-${meeting.date}.pdf`.replace(/[^a-zA-Z0-9-_\\.]/g, "_");

  return new NextResponse(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
