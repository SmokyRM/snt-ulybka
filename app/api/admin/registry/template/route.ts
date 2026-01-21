import { getSessionUser, hasImportAccess } from "@/lib/session.server";
import { forbidden, serverError } from "@/lib/api/respond";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!hasImportAccess(user)) {
      return forbidden(request, "forbidden");
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
    return new Response(content, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="registry_template.csv"',
      },
    });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
