import type { ActivityLogEntry } from "@/lib/activityLog.store";

type Props = {
  activity: ActivityLogEntry | null;
};

const roleLabels: Record<string, string> = {
  chairman: "Председатель",
  secretary: "Секретарь",
  accountant: "Бухгалтер",
  admin: "Администратор",
  system: "Система",
};

function formatLastActivity(activity: ActivityLogEntry): string {
  const meta = activity.meta || {};
  
  switch (activity.action) {
    case "appeal.status_changed":
      const newStatus = meta.newStatus as string | undefined;
      if (newStatus) {
        const statusLabels: Record<string, string> = {
          new: "Новое",
          in_progress: "В работе",
          needs_info: "Требует уточнения",
          closed: "Закрыто",
        };
        return `Статус: ${statusLabels[newStatus] || newStatus}`;
      }
      return "Статус изменен";
    
    case "appeal.assigned":
      const assignedRole = meta.assignedRole as string | undefined;
      if (assignedRole) {
        return `Назначено: ${roleLabels[assignedRole] || assignedRole}`;
      }
      return "Назначено";
    
    case "appeal.unassigned":
      return "Назначение снято";
    
    case "appeal.created":
      return "Создано";
    
    default:
      return activity.action.replace("appeal.", "");
  }
}

function getActorLabel(activity: ActivityLogEntry): string {
  if (activity.actorRole === "system") {
    return "Система";
  }
  if (activity.actorRole && roleLabels[activity.actorRole]) {
    return roleLabels[activity.actorRole];
  }
  return "—";
}

export default function InboxItemActivityPreview({ activity }: Props) {
  if (!activity) {
    return null;
  }

  return (
    <div className="text-xs text-zinc-400" data-testid="inbox-item-last-activity">
      <span>{formatLastActivity(activity)}</span>
      <span className="mx-1">•</span>
      <span>{getActorLabel(activity)}</span>
      <span className="mx-1">•</span>
      <span>{new Date(activity.createdAt).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}</span>
    </div>
  );
}
