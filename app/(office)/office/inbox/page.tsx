import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { can, isStaffOrAdmin } from "@/lib/rbac";
import { listAppeals } from "@/lib/appeals.store";
import { getInboxCounters } from "@/lib/office/inbox";
import InboxClient from "./InboxClient";

export default async function OfficeInboxPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff/login?next=/office/inbox");
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    redirect("/forbidden?reason=office.only&next=/office");
  }
  if (!can(role, "appeal.read", "appeal")) {
    redirect("/forbidden?reason=office.only&next=/office");
  }

  // Загружаем все обращения (фильтрация/сортировка на клиенте)
  let appeals;
  try {
    appeals = listAppeals({});
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      redirect("/staff/login?next=/office/inbox");
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      redirect("/forbidden?reason=office.only&next=/office");
    }
    throw error;
  }

  // Sprint 6.9: Вычисляем счетчики по табам (очередям) на сервере
  const counters = getInboxCounters({ userId: user.id, role: user.role });
  const queueCounters = {
    all: counters.totalOpen,
    secretary: appeals.filter((a) => a.status !== "closed" && a.assigneeRole === "secretary").length,
    accountant: appeals.filter((a) => a.status !== "closed" && a.assigneeRole === "accountant").length,
    chairman: appeals.filter((a) => a.status !== "closed" && a.assigneeRole === "chairman").length,
  };

  const params = (await Promise.resolve(searchParams ?? {})) as Record<string, string | string[] | undefined>;

  return (
    <InboxClient
      appeals={appeals}
      currentUserId={user.id}
      currentRole={user.role}
      queueCounters={queueCounters}
      initialQueue={(typeof params.queue === "string" ? params.queue : undefined)}
    />
  );
}
