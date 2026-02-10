"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost, ApiError } from "@/lib/api/client";
import CabinetCard from "../../_components/CabinetCard";
import EmptyState from "../../_components/EmptyState";
import LoadingState from "../../_components/LoadingState";
import ErrorState from "../../_components/ErrorState";

type AgendaItem = {
  id: string;
  title: string;
  description: string | null;
  requiresVote: boolean;
};

type Material = {
  id: string;
  title: string;
  documentId: string | null;
};

type Question = {
  id: string;
  question: string;
  answer: string | null;
  status: string;
};

type Vote = {
  id: string;
  agendaItemId: string;
  status: "draft" | "open" | "closed";
  quorumType: "persons" | "plots";
  quorumRequired: number;
};

type MeetingPayload = {
  meeting: { id: string; title: string; status: string };
  agenda: AgendaItem[];
  materials: Material[];
  questions: Question[];
  votes: Vote[];
};

export default function MeetingDetailClient({ meetingId }: { meetingId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MeetingPayload | null>(null);
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [voteResults, setVoteResults] = useState<Record<string, { counts: Record<string, number>; quorumMet: boolean }>>(
    {}
  );

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<MeetingPayload>(`/api/cabinet/meetings/${meetingId}`);
      setData(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось загрузить собрание");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [meetingId]);

  const submitQuestion = async () => {
    if (!question.trim()) return;
    setSending(true);
    try {
      await apiPost(`/api/cabinet/meetings/${meetingId}/questions`, { question: question.trim() });
      setQuestion("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось отправить вопрос");
    } finally {
      setSending(false);
    }
  };

  const castVote = async (voteId: string, choice: "yes" | "no" | "abstain") => {
    try {
      await apiPost(`/api/cabinet/votes/${voteId}/cast`, { choice });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка голосования");
    }
  };

  const loadResults = async (voteId: string) => {
    try {
      const res = await apiGet<{ results: { counts: Record<string, number>; quorumMet: boolean } }>(
        `/api/cabinet/votes/${voteId}/results`
      );
      setVoteResults((prev) => ({ ...prev, [voteId]: res.results }));
    } catch {
      return;
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState title="Ошибка" details={error} />;
  if (!data) return <EmptyState title="Собрание не найдено" description="Нет данных." />;

  return (
    <div className="space-y-4">
      <CabinetCard>
        <div className="text-lg font-semibold text-zinc-900">{data.meeting.title}</div>
        <div className="text-xs text-zinc-500">Статус: {data.meeting.status}</div>
      </CabinetCard>

      <CabinetCard>
        <div className="text-sm font-semibold text-zinc-900">Повестка</div>
        <div className="mt-2 space-y-2 text-sm text-zinc-700">
          {data.agenda.length === 0 ? "Нет пунктов." : null}
          {data.agenda.map((item) => (
            <div key={item.id}>
              <div className="font-semibold">{item.title}</div>
              {item.description && <div className="text-xs text-zinc-500">{item.description}</div>}
            </div>
          ))}
        </div>
      </CabinetCard>

      <CabinetCard>
        <div className="text-sm font-semibold text-zinc-900">Материалы</div>
        <div className="mt-2 space-y-2 text-sm text-zinc-700">
          {data.materials.length === 0 ? "Нет материалов." : null}
          {data.materials.map((item) => (
            <div key={item.id}>{item.title}</div>
          ))}
        </div>
      </CabinetCard>

      <CabinetCard>
        <div className="text-sm font-semibold text-zinc-900">Вопросы</div>
        <div className="mt-2 space-y-2 text-sm text-zinc-700">
          {data.questions.map((item) => (
            <div key={item.id} className="rounded border border-zinc-200 p-2">
              <div>{item.question}</div>
              {item.answer && <div className="text-xs text-zinc-500">Ответ: {item.answer}</div>}
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            className="flex-1 rounded border border-zinc-200 px-3 py-2 text-sm"
            placeholder="Ваш вопрос"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button
            type="button"
            onClick={submitQuestion}
            disabled={sending}
            className="rounded bg-[#5E704F] px-3 py-2 text-sm font-semibold text-white"
          >
            Отправить
          </button>
        </div>
      </CabinetCard>

      <CabinetCard>
        <div className="text-sm font-semibold text-zinc-900">Голосования</div>
        <div className="mt-2 space-y-3 text-sm text-zinc-700">
          {data.votes.length === 0 ? "Нет голосований." : null}
          {data.votes.map((vote) => (
            <div key={vote.id} className="rounded border border-zinc-200 p-2">
              <div>Статус: {vote.status}</div>
              {vote.status === "open" && (
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => castVote(vote.id, "yes")}
                    className="rounded border border-zinc-200 px-2 py-1 text-xs"
                  >
                    За
                  </button>
                  <button
                    type="button"
                    onClick={() => castVote(vote.id, "no")}
                    className="rounded border border-zinc-200 px-2 py-1 text-xs"
                  >
                    Против
                  </button>
                  <button
                    type="button"
                    onClick={() => castVote(vote.id, "abstain")}
                    className="rounded border border-zinc-200 px-2 py-1 text-xs"
                  >
                    Воздержался
                  </button>
                </div>
              )}
              {vote.status === "closed" && (
                <div className="mt-2 text-xs text-zinc-500">
                  <button type="button" onClick={() => loadResults(vote.id)} className="text-[#5E704F]">
                    Показать результаты
                  </button>
                  {voteResults[vote.id] && (
                    <div className="mt-2">
                      За: {voteResults[vote.id].counts.yes} · Против: {voteResults[vote.id].counts.no} · Воздержались:{" "}
                      {voteResults[vote.id].counts.abstain} · Кворум: {voteResults[vote.id].quorumMet ? "есть" : "нет"}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </CabinetCard>
    </div>
  );
}
