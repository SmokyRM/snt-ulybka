"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, ApiError } from "@/lib/api/client";
import OfficeLoadingState from "../../_components/OfficeLoadingState";
import OfficeErrorState from "../../_components/OfficeErrorState";

type Meeting = {
  id: string;
  title: string;
  type: "general" | "board" | "extra";
  status: "draft" | "published" | "closed" | "archived";
  startsAt: string | null;
  endsAt: string | null;
  publishedAt: string | null;
};

type AgendaItem = {
  id: string;
  title: string;
  description: string | null;
  requiresVote: boolean;
  position: number;
};

type Material = {
  id: string;
  title: string;
  documentId: string | null;
  visibility: "residents" | "office";
};

type Question = {
  id: string;
  question: string;
  answer: string | null;
  status: "new" | "answered" | "hidden";
};

type Vote = {
  id: string;
  agendaItemId: string;
  status: "draft" | "open" | "closed";
  quorumType: "persons" | "plots";
  quorumRequired: number;
};

type MeetingPayload = {
  meeting: Meeting;
  agenda: AgendaItem[];
  materials: Material[];
  questions: Question[];
  votes: Vote[];
};

export default function MeetingEditorClient({ meetingId }: { meetingId?: string | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(Boolean(meetingId));
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);

  const [title, setTitle] = useState("");
  const [type, setType] = useState<Meeting["type"]>("general");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [saving, setSaving] = useState(false);

  const [newAgendaTitle, setNewAgendaTitle] = useState("");
  const [newAgendaDescription, setNewAgendaDescription] = useState("");
  const [newAgendaVote, setNewAgendaVote] = useState(false);

  const [materialTitle, setMaterialTitle] = useState("");
  const [materialDocId, setMaterialDocId] = useState("");
  const [materialVisibility, setMaterialVisibility] = useState<Material["visibility"]>("residents");

  const reload = async () => {
    if (!meetingId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<MeetingPayload>(`/api/office/meetings/${meetingId}`);
      setMeeting(data.meeting);
      setAgenda(data.agenda);
      setMaterials(data.materials);
      setQuestions(data.questions);
      setVotes(data.votes);
      setTitle(data.meeting.title);
      setType(data.meeting.type);
      setStartsAt(data.meeting.startsAt ?? "");
      setEndsAt(data.meeting.endsAt ?? "");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось загрузить собрание");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (meetingId) void reload();
  }, [meetingId]);

  const saveMeeting = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (!title.trim()) {
        setError("Введите название собрания");
        return;
      }
      if (meetingId) {
        await apiPost(`/api/office/meetings/${meetingId}`, {
          title: title.trim(),
          type,
          startsAt: startsAt || null,
          endsAt: endsAt || null,
        });
        await reload();
        setMessage("Сохранено");
      } else {
        const res = await apiPost<{ meeting: Meeting }>(`/api/office/meetings`, {
          title: title.trim(),
          type,
          startsAt: startsAt || null,
          endsAt: endsAt || null,
        });
        router.push(`/office/meetings/${res.meeting.id}`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const saveAgenda = async () => {
    if (!meetingId) return;
    setSaving(true);
    setError(null);
    try {
      await apiPost(`/api/office/meetings/${meetingId}/agenda`, {
        items: agenda.map((item, index) => ({
          position: index,
          title: item.title,
          description: item.description,
          requiresVote: item.requiresVote,
        })),
      });
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка сохранения повестки");
    } finally {
      setSaving(false);
    }
  };

  const addAgenda = () => {
    if (!newAgendaTitle.trim()) return;
    setAgenda((prev) => [
      ...prev,
      {
        id: `tmp-${Date.now()}`,
        title: newAgendaTitle.trim(),
        description: newAgendaDescription.trim() || null,
        requiresVote: newAgendaVote,
        position: prev.length,
      },
    ]);
    setNewAgendaTitle("");
    setNewAgendaDescription("");
    setNewAgendaVote(false);
  };

  const addMaterial = async () => {
    if (!meetingId) return;
    if (!materialTitle.trim()) {
      setError("Введите название материала");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiPost(`/api/office/meetings/${meetingId}/materials`, {
        title: materialTitle.trim(),
        documentId: materialDocId.trim() || null,
        visibility: materialVisibility,
      });
      setMaterialTitle("");
      setMaterialDocId("");
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка добавления материала");
    } finally {
      setSaving(false);
    }
  };

  const publishMeeting = async () => {
    if (!meetingId) return;
    await apiPost(`/api/office/meetings/${meetingId}/publish`);
    await reload();
  };

  const closeMeeting = async () => {
    if (!meetingId) return;
    await apiPost(`/api/office/meetings/${meetingId}/close`);
    await reload();
  };

  const answerQuestion = async (questionId: string, status: "answered" | "hidden") => {
    if (!meetingId) return;
    const answer = status === "answered" ? prompt("Ответ для жителя") ?? "" : "";
    await apiPost(`/api/office/meetings/${meetingId}/questions/${questionId}/answer`, {
      status,
      answer,
    });
    await reload();
  };

  const createVote = async (agendaItemId: string) => {
    if (!meetingId) return;
    await apiPost(`/api/office/meetings/${meetingId}/votes`, {
      agendaItemId,
      quorumType: "persons",
      quorumRequired: 0.5,
    });
    await reload();
  };

  const openVote = async (voteId: string) => {
    await apiPost(`/api/office/votes/${voteId}/open`);
    await reload();
  };

  const closeVote = async (voteId: string) => {
    await apiPost(`/api/office/votes/${voteId}/close`);
    await reload();
  };

  if (loading) {
    return <OfficeLoadingState message="Загрузка собрания..." testId="office-meeting-loading" />;
  }

  if (error) {
    return <OfficeErrorState message={error} testId="office-meeting-error" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            {meetingId ? "Редактирование собрания" : "Новое собрание"}
          </h1>
          {meeting && <div className="text-xs text-zinc-500">Статус: {meeting.status}</div>}
        </div>
        <div className="flex gap-2">
          {meetingId && (
            <>
              <button
                type="button"
                onClick={publishMeeting}
                className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700"
              >
                Опубликовать
              </button>
              <button
                type="button"
                onClick={closeMeeting}
                className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700"
              >
                Закрыть
              </button>
            </>
          )}
          <button
            type="button"
            onClick={saveMeeting}
            disabled={saving}
            className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>

      {message && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm">{message}</div>}

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-zinc-800">
            Название
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm text-zinc-800">
            Тип
            <select
              value={type}
              onChange={(e) => setType(e.target.value as Meeting["type"])}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            >
              <option value="general">Общее</option>
              <option value="board">Правление</option>
              <option value="extra">Внеочередное</option>
            </select>
          </label>
          <label className="text-sm text-zinc-800">
            Начало
            <input
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
              placeholder="2026-02-09T18:00"
            />
          </label>
          <label className="text-sm text-zinc-800">
            Конец
            <input
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
              placeholder="2026-02-09T20:00"
            />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-zinc-900">Повестка</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder="Название пункта"
            value={newAgendaTitle}
            onChange={(e) => setNewAgendaTitle(e.target.value)}
          />
          <input
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder="Описание"
            value={newAgendaDescription}
            onChange={(e) => setNewAgendaDescription(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm text-zinc-600">
            <input type="checkbox" checked={newAgendaVote} onChange={(e) => setNewAgendaVote(e.target.checked)} />
            Требует голосования
          </label>
        </div>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={addAgenda}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700"
          >
            Добавить
          </button>
          <button
            type="button"
            onClick={saveAgenda}
            className="rounded-lg bg-[#5E704F] px-3 py-2 text-sm font-semibold text-white"
          >
            Сохранить повестку
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {agenda.map((item) => (
            <div key={item.id} className="rounded-lg border border-zinc-200 p-3 text-sm">
              <div className="font-semibold text-zinc-900">{item.title}</div>
              {item.description && <div className="text-xs text-zinc-600">{item.description}</div>}
              {item.requiresVote && (
                <div className="mt-2 text-xs text-zinc-600">
                  Голосование:{" "}
                  {votes.find((vote) => vote.agendaItemId === item.id) ? (
                    <span>создано</span>
                  ) : (
                    <button
                      type="button"
                      className="text-[#5E704F] font-semibold"
                      onClick={() => createVote(item.id)}
                    >
                      создать
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-zinc-900">Материалы</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder="Название"
            value={materialTitle}
            onChange={(e) => setMaterialTitle(e.target.value)}
          />
          <input
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder="Document ID"
            value={materialDocId}
            onChange={(e) => setMaterialDocId(e.target.value)}
          />
          <select
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            value={materialVisibility}
            onChange={(e) => setMaterialVisibility(e.target.value as Material["visibility"])}
          >
            <option value="residents">Жителям</option>
            <option value="office">Только офис</option>
          </select>
        </div>
        <button
          type="button"
          onClick={addMaterial}
          className="mt-3 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700"
        >
          Добавить материал
        </button>
        <div className="mt-3 space-y-2 text-sm text-zinc-700">
          {materials.map((material) => (
            <div key={material.id}>
              {material.title} · {material.visibility}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-zinc-900">Вопросы жителей</div>
        <div className="mt-3 space-y-2 text-sm">
          {questions.length === 0 ? (
            <div className="text-zinc-500">Нет вопросов.</div>
          ) : (
            questions.map((q) => (
              <div key={q.id} className="rounded-lg border border-zinc-200 p-3">
                <div className="font-semibold text-zinc-900">{q.question}</div>
                <div className="text-xs text-zinc-500">Статус: {q.status}</div>
                {q.answer && <div className="mt-2 text-xs text-zinc-700">Ответ: {q.answer}</div>}
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="text-[#5E704F] text-xs font-semibold"
                    onClick={() => answerQuestion(q.id, "answered")}
                  >
                    Ответить
                  </button>
                  <button
                    type="button"
                    className="text-xs text-zinc-500"
                    onClick={() => answerQuestion(q.id, "hidden")}
                  >
                    Скрыть
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-zinc-900">Голосования</div>
        <div className="mt-3 space-y-2 text-sm">
          {votes.length === 0 ? (
            <div className="text-zinc-500">Голосований нет.</div>
          ) : (
            votes.map((vote) => (
              <div key={vote.id} className="rounded-lg border border-zinc-200 p-3">
                <div>Статус: {vote.status}</div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="text-[#5E704F] text-xs font-semibold"
                    onClick={() => openVote(vote.id)}
                  >
                    Открыть
                  </button>
                  <button
                    type="button"
                    className="text-xs text-zinc-500"
                    onClick={() => closeVote(vote.id)}
                  >
                    Закрыть
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
