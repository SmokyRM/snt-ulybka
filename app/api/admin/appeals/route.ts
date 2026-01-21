import { getAllAppeals } from "@/lib/appeals";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { forbidden, ok, serverError } from "@/lib/api/respond";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) {
    return forbidden(request);
  }
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");
    const topicFilter = searchParams.get("topic");
    const query = (searchParams.get("q") ?? "").toLowerCase();
    const appeals = await getAllAppeals();
    const filtered = appeals.filter((a) => {
      const statusOk = statusFilter ? a.status === statusFilter : true;
      const topicOk = topicFilter ? a.topic === topicFilter : true;
      const qOk = query
        ? a.message.toLowerCase().includes(query) || a.topic.toLowerCase().includes(query)
        : true;
      return statusOk && topicOk && qOk;
    });
    return ok(request, { appeals: filtered });
  } catch (e) {
    return serverError(request, "Internal error", e);
  }
}
