"use client";

import { useEffect, useState } from "react";
import { apiGet, ApiError } from "@/lib/api/client";
import CabinetCard from "../_components/CabinetCard";
import EmptyState from "../_components/EmptyState";
import LoadingState from "../_components/LoadingState";
import ErrorState from "../_components/ErrorState";

type Meeting = {
  id: string;
  title: string;
  type: string;
  status: "published" | "closed";
  startsAt: string | null;
  endsAt: string | null;
  publishedAt: string | null;
};

export default function MeetingsClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiGet<{ meetings: Meeting[] }>("/api/cabinet/meetings");
        setMeetings(data.meetings);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Не удалось загрузить собрания");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState title="Ошибка" details={error} />;
  if (!meetings.length) {
    return <EmptyState title="Нет собраний" description="Пока нет опубликованных собраний." />;
  }

  return (
    <div className="grid gap-3">
      {meetings.map((meeting) => (
        <CabinetCard key={meeting.id}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="text-lg font-semibold text-zinc-900">{meeting.title}</div>
              <div className="text-xs text-zinc-500">Статус: {meeting.status}</div>
            </div>
            <a className="text-sm font-semibold text-[#5E704F]" href={`/cabinet/meetings/${meeting.id}`}>
              Подробнее
            </a>
          </div>
        </CabinetCard>
      ))}
    </div>
  );
}
