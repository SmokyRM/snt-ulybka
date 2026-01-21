"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { assignToMeAction, unassignAppealAction, assignToUserAction } from "../appeals/actions";

type Props = {
  appealId: string;
  assignedToUserId?: string | null; // Sprint 2.2: используем assignedToUserId
  assigneeRole?: "chairman" | "secretary" | "accountant" | "admin"; // Deprecated
  assigneeName?: string;
  currentUserId?: string;
  currentRole?: string;
};

export default function InboxRowActions({
  appealId,
  assignedToUserId,
  assigneeRole,
  assigneeName,
  currentUserId,
  currentRole,
}: Props) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showReassignMenu, setShowReassignMenu] = useState(false);

  // Sprint 2.2: используем assignedToUserId (с fallback на assigneeRole для обратной совместимости)
  const isAssignedToMe = assignedToUserId === currentUserId;
  const isAssignedToOther = assignedToUserId && assignedToUserId !== currentUserId;
  const canReassign = (currentRole === "admin" || currentRole === "chairman") && isAssignedToOther;
  const isNotAssigned = !assignedToUserId && !assigneeRole;

  const handleAssignToMe = async () => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.set("id", appealId);
      await assignToMeAction(formData);
      router.refresh();
    } catch (error) {
      console.error("Failed to assign to me:", error);
      // TODO: показать toast/уведомление об ошибке
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnassign = async () => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.set("id", appealId);
      await unassignAppealAction(formData);
      router.refresh();
    } catch (error) {
      console.error("Failed to unassign:", error);
      // TODO: показать toast/уведомление об ошибке
    } finally {
      setIsLoading(false);
    }
  };

  const handleReassignToMe = async () => {
    setIsLoading(true);
    setShowReassignMenu(false);
    try {
      const formData = new FormData();
      formData.set("id", appealId);
      formData.set("targetUserId", currentUserId || "");
      await assignToUserAction(formData);
      router.refresh();
    } catch (error) {
      console.error("Failed to reassign to me:", error);
      // TODO: показать toast/уведомление об ошибке
    } finally {
      setIsLoading(false);
    }
  };

  const roleLabels: Record<"chairman" | "secretary" | "accountant" | "admin", string> = {
    chairman: "Председатель",
    secretary: "Секретарь",
    accountant: "Бухгалтер",
    admin: "Администратор",
  };

  const getAssigneeLabel = () => {
    // Sprint 2.2: используем assignedToUserId (с fallback на assigneeRole)
    if (assignedToUserId) {
      // Используем имя пользователя, если есть, иначе userId
      return assigneeName || assignedToUserId;
    }
    if (assigneeRole) {
      return roleLabels[assigneeRole] || assigneeRole;
    }
    return null;
  };

  return (
    <div className="flex items-center gap-2">
      {/* Информация о назначении */}
      {(assignedToUserId || assigneeRole) && (
        <span className="text-xs text-zinc-500" data-testid={`inbox-assignee-${appealId}`}>
          Ответственный: {getAssigneeLabel()}
        </span>
      )}

      {/* Кнопки управления назначением */}
      {isNotAssigned && (
        <button
          onClick={handleAssignToMe}
          disabled={isLoading}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
          data-testid={`inbox-assign-to-me-${appealId}`}
        >
          {isLoading ? "..." : "Назначить на меня"}
        </button>
      )}

      {isAssignedToMe && (
        <button
          onClick={handleUnassign}
          disabled={isLoading}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
          data-testid={`inbox-unassign-${appealId}`}
        >
          {isLoading ? "..." : "Снять"}
        </button>
      )}

      {canReassign && (
        <div className="relative">
          <button
            onClick={() => setShowReassignMenu(!showReassignMenu)}
            disabled={isLoading}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
            data-testid={`inbox-reassign-${appealId}`}
          >
            {isLoading ? "..." : "Передать..."}
          </button>

          {showReassignMenu && (
            <>
              {/* Overlay для закрытия меню */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowReassignMenu(false)}
              />
              {/* Dropdown меню */}
              <div className="absolute right-0 top-full z-20 mt-1 rounded-md border border-zinc-200 bg-white shadow-lg">
                <div className="py-1">
                  <button
                    onClick={handleReassignToMe}
                    disabled={isLoading}
                    className="block w-full px-3 py-1.5 text-left text-xs text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                  >
                    Передать на меня
                  </button>
                  {/* TODO: Добавить селект пользователей для передачи другому пользователю */}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
