import { NextResponse } from "next/server";
import { getSessionUser, isAdmin } from "@/lib/session.server";

export async function GET() {
  const user = await getSessionUser();
  if (!isAdmin(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const headers = ["plot_display", "cadastral_number", "seed_owner_name", "seed_owner_phone", "note"];
  const example = [
    "Улица Березовая, участок 12",
    "74:00:0000000:1234",
    "Иванов Иван Иванович",
    "89991234567",
    "Комментарий",
  ];
  const content = `\uFEFF${headers.join(";")}\r\n${example.join(";")}\r\n`;
  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="registry_template.csv"',
    },
  });
}
