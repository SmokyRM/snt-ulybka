import Link from "next/link";
import { redirect } from "next/navigation";

import { processOutbox, listOutbox } from "@/lib/office/appeals.server";
import { hasPermission, isOfficeRole, isStaffOrAdmin } from "@/lib/rbac";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { processOutboxAction, retryOutboxAction } from "./actions";

export default async function OutboxPage() {
  const session = await getEffectiveSessionUser();
  const role = session?.role;

  if (!isStaffOrAdmin(role)) {
    redirect("/forbidden?reason=office.only&next=/office");
  }
  if (!hasPermission(role as Role, "office.view")) {
    redirect("/forbidden?reason=office.only&next=/office");
  }

  const items = listOutbox();
  const roleValue = role as Role | undefined;
  const canManage = roleValue === "admin" || roleValue === "chairman" || roleValue === "secretary";

  return (
    <div className="space-y-6" data-testid="office-outbox-root">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Очередь отправки</h1>
          <p className="text-sm text-zinc-500">Ответы жителям, ожидающие доставки.</p>
        </div>
        {canManage ? (
          <form action={processOutboxAction}>
            <button
              type="submit"
              data-testid="office-outbox-run"
              className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4d5d41]"
            >
              Обработать очередь
            </button>
          </form>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="grid grid-cols-8 gap-3 border-b border-zinc-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <span>ID</span>
            <span>Обращение</span>
            <span>Канал</span>
            <span>Статус</span>
            <span>Попытки</span>
            <span>Сообщение</span>
            <span className="text-right">Действия</span>
            <span className="text-right">Обновлено</span>
          </div>
          <div className="divide-y divide-zinc-100">
            {items.length === 0 ? (
              <div className="px-4 py-6 text-sm text-zinc-500">Очередь пуста.</div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  data-testid={`office-outbox-row-${item.id}`}
                  className="grid grid-cols-8 items-center gap-3 px-4 py-3 text-sm"
                >
                  <span className="font-mono text-xs text-zinc-500">{item.id}</span>
                  <Link href={`/office/appeals/${item.appealId}`} className="text-[#5E704F] hover:underline">
                    #{item.appealId}
                  </Link>
                <span className="capitalize">{item.channelPlanned}</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      item.status === "pending"
                        ? "bg-amber-100 text-amber-800"
                        : item.status === "sent"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {item.status}
                  </span>
                  {item.lastError ? <span className="text-xs text-rose-600">{item.lastError}</span> : null}
                </div>
                <span>{item.attempts}</span>
                <div className="flex flex-col text-xs text-zinc-500">
                  {item.providerMessageId ? <span>msg: {item.providerMessageId}</span> : null}
                  {item.lastAttemptAt ? <span>время: {new Date(item.lastAttemptAt).toLocaleTimeString("ru-RU")}</span> : null}
                </div>
                <div className="flex items-center justify-end gap-2">
                  {item.status === "failed" && canManage ? (
                    <form action={retryOutboxAction} className="inline">
                      <input type="hidden" name="id" value={item.id} />
                      <button
                        type="submit"
                        data-testid={`office-outbox-retry-${item.id}`}
                        className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700 transition hover:border-[#5E704F] hover:text-[#5E704F]"
                      >
                        Повторить
                      </button>
                    </form>
                  ) : null}
                  <span className="text-xs text-zinc-400">
                    {new Date(item.updatedAt).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
  );
}
