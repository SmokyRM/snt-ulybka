"use client";

import Link from "next/link";
import { useMemo } from "react";

type AnnouncementCard = {
  id: string;
  title: string;
  body: string;
  publishedAt: string | null;
  isImportant: boolean;
};

export default function RecentAnnouncements({
  items,
  linkHref = "/cabinet/announcements",
  telegramHref,
  vkHref,
}: {
  items: AnnouncementCard[];
  linkHref?: string;
  telegramHref?: string;
  vkHref?: string;
}) {
  const list = useMemo(
    () =>
      items.slice(0, 3).map((item) => ({
        ...item,
        date: item.publishedAt
          ? new Date(item.publishedAt).toLocaleDateString("ru-RU")
          : "",
        preview: item.body.length > 140 ? `${item.body.slice(0, 140)}…` : item.body,
      })),
    [items],
  );

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-zinc-900">Последние объявления</h3>
        <Link href={linkHref} className="text-xs font-semibold text-[#5E704F] hover:underline">
          Все объявления →
        </Link>
      </div>
      {list.length === 0 ? (
        <div className="space-y-2 text-sm text-zinc-600">
          <div>Пока нет объявлений.</div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold text-[#5E704F]">
            {telegramHref ? (
              <a
                href={telegramHref}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-zinc-200 px-3 py-1 hover:border-[#5E704F]"
              >
                Подписаться в Telegram
              </a>
            ) : null}
            {vkHref ? (
              <a
                href={vkHref}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-zinc-200 px-3 py-1 hover:border-[#5E704F]"
              >
                Подписаться в VK
              </a>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="space-y-3 text-sm text-zinc-700">
          {list.map((item) => (
            <Link
              key={item.id}
              href={linkHref}
              className="block rounded-xl border border-zinc-100 px-3 py-2 transition hover:border-[#5E704F]/60"
            >
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span>{item.date}</span>
                {item.isImportant ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                    Важно
                  </span>
                ) : null}
              </div>
              <div className="mt-1 text-sm font-semibold text-zinc-900">{item.title}</div>
              <div className="text-xs text-zinc-600">{item.preview}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
