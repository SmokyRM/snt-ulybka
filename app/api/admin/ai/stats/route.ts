import { getSessionUser } from "@/lib/session.server";
import { isAdminRole, normalizeRole } from "@/lib/rbac";
import { listAiEvents } from "@/lib/mockDb";
import { forbidden, ok, serverError, unauthorized } from "@/lib/api/respond";

function parsePeriod(period: string | null): { from: string; to: string } {
  const now = new Date();
  let from: Date;
  
  if (period === "today") {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === "7d") {
    from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (period === "30d") {
    from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else {
    // Default to 7d
    from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  
  return {
    from: from.toISOString(),
    to: now.toISOString(),
  };
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return unauthorized(request);
  }

  const normalizedRole = normalizeRole(user.role);
  if (!isAdminRole(normalizedRole)) {
    return forbidden(request);
  }

  try {
    const url = new URL(request.url);
    const period = url.searchParams.get("period") || "7d";
    const { from, to } = parsePeriod(period);

    const events = listAiEvents({ from, to });

    // Counts by event type
    const counts = {
      assistant_opened: events.filter((e) => e.eventType === "assistant_opened").length,
      question_asked: events.filter((e) => e.eventType === "question_asked").length,
      answer_shown: events.filter((e) => e.eventType === "answer_shown").length,
    };

    // Top routes
    const routeFrequency = new Map<string, number>();
    events.forEach((e) => {
      if (e.route) {
        routeFrequency.set(e.route, (routeFrequency.get(e.route) || 0) + 1);
      }
    });
    const topRoutes = Array.from(routeFrequency.entries())
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 10)
      .map(([route, count]) => ({ route, count }));

    // Top roles
    const roleFrequency = new Map<string, number>();
    events.forEach((e) => {
      if (e.role) {
        roleFrequency.set(e.role, (roleFrequency.get(e.role) || 0) + 1);
      }
    });
    const topRoles = Array.from(roleFrequency.entries())
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 10)
      .map(([role, count]) => ({ role, count }));

    return ok(request, {
      period,
      from,
      to,
      counts,
      topRoutes,
      topRoles,
      totalEvents: events.length,
    });
  } catch (e) {
    return serverError(request, "Internal error", e);
  }
}
