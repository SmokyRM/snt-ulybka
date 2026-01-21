import { ok, serverError } from "@/lib/api/respond";
import { hasOpenAIKey } from "@/lib/openai.server";

export async function GET(request: Request) {
  try {
    return ok(request, { hasKey: hasOpenAIKey() });
  } catch (error) {
    return serverError(request, "Ошибка при проверке OpenAI ключа", error);
  }
}
