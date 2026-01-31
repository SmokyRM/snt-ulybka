"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MeetingAgendaItem, MeetingAttachment, MeetingDecision, MeetingMinutes, MeetingVote } from "@/lib/meetingMinutes";
import { readOk } from "@/lib/api/client";

type MeetingEditorClientProps = {
  initialMeeting?: MeetingMinutes | null;
};

const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export default function MeetingEditorClient({ initialMeeting }: MeetingEditorClientProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [title, setTitle] = useState(initialMeeting?.title ?? "");
  const [date, setDate] = useState(initialMeeting?.date ?? "");
  const [location, setLocation] = useState(initialMeeting?.location ?? "");
  const [attendees, setAttendees] = useState(initialMeeting?.attendees ?? "");
  const [summary, setSummary] = useState(initialMeeting?.summary ?? "");
  const [status, setStatus] = useState<MeetingMinutes["status"]>(initialMeeting?.status ?? "draft");

  const [agenda, setAgenda] = useState<MeetingAgendaItem[]>(initialMeeting?.agenda ?? []);
  const [votes, setVotes] = useState<MeetingVote[]>(initialMeeting?.votes ?? []);
  const [decisions, setDecisions] = useState<MeetingDecision[]>(initialMeeting?.decisions ?? []);
  const [attachments, setAttachments] = useState<MeetingAttachment[]>(initialMeeting?.attachments ?? []);
  const [uploading, setUploading] = useState(false);

  const meetingId = initialMeeting?.id ?? null;
  const canUpload = Boolean(meetingId);

  const voteOptionsById = useMemo(() => new Map(votes.map((v) => [v.id, v.question])), [votes]);

  const addAgendaItem = () => {
    setAgenda((prev) => [...prev, { id: makeId(), title: "", presenter: "", notes: "" }]);
  };

  const addVote = () => {
    const vote: MeetingVote = {
      id: makeId(),
      question: "",
      options: [{ option: "За", votes: 0 }, { option: "Против", votes: 0 }, { option: "Воздержались", votes: 0 }],
      result: "",
      notes: "",
    };
    setVotes((prev) => [...prev, vote]);
  };

  const addDecision = () => {
    setDecisions((prev) => [
      ...prev,
      {
        id: makeId(),
        title: "",
        category: "",
        status: "approved",
        outcome: "",
        voteId: null,
        responsible: "",
        dueDate: "",
      },
    ]);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = {
        title,
        date,
        location,
        attendees,
        summary,
        status,
        agenda,
        votes,
        decisions,
        attachments,
      };
      if (!title.trim() || !date.trim()) {
        setError("Заполните название и дату протокола.");
        return;
      }
      if (meetingId) {
        const res = await fetch(`/api/office/meetings/${meetingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await readOk<{ meeting: MeetingMinutes }>(res);
        setMessage("Протокол обновлён");
        setAttachments(json.meeting.attachments);
        router.refresh();
      } else {
        const res = await fetch("/api/office/meetings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await readOk<{ meeting: MeetingMinutes }>(res);
        setMessage("Протокол создан");
        router.push(`/office/meetings/${json.meeting.id}`);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (!meetingId) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch(`/api/office/meetings/${meetingId}/attachments`, {
        method: "POST",
        body: formData,
      });
      const json = await readOk<{ meeting: MeetingMinutes }>(res);
      setAttachments(json.meeting.attachments);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAttachment = async (attachmentId: string) => {
    if (!meetingId) return;
    setError(null);
    try {
      const res = await fetch(`/api/office/meetings/${meetingId}/attachments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attachmentId }),
      });
      const json = await readOk<{ meeting: MeetingMinutes }>(res);
      setAttachments(json.meeting.attachments);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{meetingId ? "Редактировать протокол" : "Новый протокол"}</h1>
          <p className="text-sm text-zinc-600">Повестка, голосования, решения и итоговый протокол собрания.</p>
        </div>
        <div className="flex gap-2">
          {meetingId && (
            <button
              type="button"
              onClick={() => window.open(`/api/office/meetings/${meetingId}/export.pdf`, "_blank", "noopener,noreferrer")}
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-zinc-300"
            >
              Экспорт PDF
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4d5d41] disabled:opacity-60"
          >
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div>}
      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">{message}</div>
      )}

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900">Общие сведения</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-zinc-800">
            Название протокола
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
              placeholder="Протокол заседания правления"
            />
          </label>
          <label className="text-sm text-zinc-800">
            Дата
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm text-zinc-800">
            Место проведения
            <input
              value={location ?? ""}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
              placeholder="Правление, кабинет"
            />
          </label>
          <label className="text-sm text-zinc-800">
            Участники
            <input
              value={attendees ?? ""}
              onChange={(e) => setAttendees(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
              placeholder="ФИО, роли"
            />
          </label>
          <label className="text-sm text-zinc-800">
            Статус
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as MeetingMinutes["status"])}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            >
              <option value="draft">Черновик</option>
              <option value="published">Опубликован</option>
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Повестка</h2>
          <button
            type="button"
            onClick={addAgendaItem}
            className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700"
          >
            + пункт
          </button>
        </div>
        {agenda.length === 0 ? (
          <p className="text-sm text-zinc-600">Добавьте пункты повестки.</p>
        ) : (
          <div className="space-y-3">
            {agenda.map((item, idx) => (
              <div key={item.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 space-y-2">
                <div className="text-xs font-semibold text-zinc-600">Пункт {idx + 1}</div>
                <input
                  value={item.title}
                  onChange={(e) =>
                    setAgenda((prev) =>
                      prev.map((a) => (a.id === item.id ? { ...a, title: e.target.value } : a))
                    )
                  }
                  className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                  placeholder="Обсудить..."
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={item.presenter ?? ""}
                    onChange={(e) =>
                      setAgenda((prev) =>
                        prev.map((a) => (a.id === item.id ? { ...a, presenter: e.target.value } : a))
                      )
                    }
                    className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                    placeholder="Докладчик"
                  />
                  <input
                    value={item.notes ?? ""}
                    onChange={(e) =>
                      setAgenda((prev) =>
                        prev.map((a) => (a.id === item.id ? { ...a, notes: e.target.value } : a))
                      )
                    }
                    className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                    placeholder="Примечание"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setAgenda((prev) => prev.filter((a) => a.id !== item.id))}
                  className="text-xs font-semibold text-rose-600"
                >
                  Удалить пункт
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Голосования</h2>
          <button
            type="button"
            onClick={addVote}
            className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700"
          >
            + голосование
          </button>
        </div>
        {votes.length === 0 ? (
          <p className="text-sm text-zinc-600">Добавьте вопросы для голосования.</p>
        ) : (
          <div className="space-y-3">
            {votes.map((vote, idx) => (
              <div key={vote.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 space-y-2">
                <div className="text-xs font-semibold text-zinc-600">Вопрос {idx + 1}</div>
                <input
                  value={vote.question}
                  onChange={(e) =>
                    setVotes((prev) =>
                      prev.map((v) => (v.id === vote.id ? { ...v, question: e.target.value } : v))
                    )
                  }
                  className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                  placeholder="Вопрос голосования"
                />
                <div className="space-y-2">
                  {vote.options.map((opt, optIdx) => (
                    <div key={`${vote.id}-${optIdx}`} className="grid grid-cols-[1fr_100px] gap-2">
                      <input
                        value={opt.option}
                        onChange={(e) =>
                          setVotes((prev) =>
                            prev.map((v) =>
                              v.id === vote.id
                                ? {
                                    ...v,
                                    options: v.options.map((o, i) =>
                                      i === optIdx ? { ...o, option: e.target.value } : o
                                    ),
                                  }
                                : v
                            )
                          )
                        }
                        className="rounded border border-zinc-300 px-3 py-2 text-sm"
                        placeholder="Вариант"
                      />
                      <input
                        type="number"
                        min={0}
                        value={opt.votes}
                        onChange={(e) =>
                          setVotes((prev) =>
                            prev.map((v) =>
                              v.id === vote.id
                                ? {
                                    ...v,
                                    options: v.options.map((o, i) =>
                                      i === optIdx ? { ...o, votes: Number(e.target.value) || 0 } : o
                                    ),
                                  }
                                : v
                            )
                          )
                        }
                        className="rounded border border-zinc-300 px-3 py-2 text-sm"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setVotes((prev) =>
                        prev.map((v) =>
                          v.id === vote.id
                            ? { ...v, options: [...v.options, { option: "", votes: 0 }] }
                            : v
                        )
                      )
                    }
                    className="text-xs font-semibold text-zinc-600"
                  >
                    + вариант
                  </button>
                </div>
                <input
                  value={vote.result}
                  onChange={(e) =>
                    setVotes((prev) => prev.map((v) => (v.id === vote.id ? { ...v, result: e.target.value } : v)))
                  }
                  className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                  placeholder="Итог голосования"
                />
                <input
                  value={vote.notes ?? ""}
                  onChange={(e) =>
                    setVotes((prev) => prev.map((v) => (v.id === vote.id ? { ...v, notes: e.target.value } : v)))
                  }
                  className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                  placeholder="Примечание"
                />
                <button
                  type="button"
                  onClick={() => setVotes((prev) => prev.filter((v) => v.id !== vote.id))}
                  className="text-xs font-semibold text-rose-600"
                >
                  Удалить голосование
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Решения</h2>
          <button
            type="button"
            onClick={addDecision}
            className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700"
          >
            + решение
          </button>
        </div>
        {decisions.length === 0 ? (
          <p className="text-sm text-zinc-600">Добавьте решения по итогам встречи.</p>
        ) : (
          <div className="space-y-3">
            {decisions.map((decision, idx) => (
              <div key={decision.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 space-y-2">
                <div className="text-xs font-semibold text-zinc-600">Решение {idx + 1}</div>
                <input
                  value={decision.title}
                  onChange={(e) =>
                    setDecisions((prev) =>
                      prev.map((d) => (d.id === decision.id ? { ...d, title: e.target.value } : d))
                    )
                  }
                  className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                  placeholder="Суть решения"
                />
                <div className="grid gap-2 sm:grid-cols-3">
                  <input
                    value={decision.category ?? ""}
                    onChange={(e) =>
                      setDecisions((prev) =>
                        prev.map((d) => (d.id === decision.id ? { ...d, category: e.target.value } : d))
                      )
                    }
                    className="rounded border border-zinc-300 px-3 py-2 text-sm"
                    placeholder="Категория"
                  />
                  <select
                    value={decision.status ?? "approved"}
                    onChange={(e) =>
                      setDecisions((prev) =>
                        prev.map((d) => (d.id === decision.id ? { ...d, status: e.target.value as MeetingDecision["status"] } : d))
                      )
                    }
                    className="rounded border border-zinc-300 px-3 py-2 text-sm"
                  >
                    <option value="approved">Принято</option>
                    <option value="rejected">Отклонено</option>
                    <option value="postponed">Отложено</option>
                  </select>
                  <select
                    value={decision.voteId ?? ""}
                    onChange={(e) =>
                      setDecisions((prev) =>
                        prev.map((d) => (d.id === decision.id ? { ...d, voteId: e.target.value || null } : d))
                      )
                    }
                    className="rounded border border-zinc-300 px-3 py-2 text-sm"
                  >
                    <option value="">Без голосования</option>
                    {Array.from(voteOptionsById.entries()).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label || "Голосование"}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={decision.responsible ?? ""}
                    onChange={(e) =>
                      setDecisions((prev) =>
                        prev.map((d) => (d.id === decision.id ? { ...d, responsible: e.target.value } : d))
                      )
                    }
                    className="rounded border border-zinc-300 px-3 py-2 text-sm"
                    placeholder="Ответственный"
                  />
                  <input
                    type="date"
                    value={decision.dueDate ?? ""}
                    onChange={(e) =>
                      setDecisions((prev) =>
                        prev.map((d) => (d.id === decision.id ? { ...d, dueDate: e.target.value } : d))
                      )
                    }
                    className="rounded border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
                <input
                  value={decision.outcome ?? ""}
                  onChange={(e) =>
                    setDecisions((prev) =>
                      prev.map((d) => (d.id === decision.id ? { ...d, outcome: e.target.value } : d))
                    )
                  }
                  className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                  placeholder="Итог/формулировка решения"
                />
                <button
                  type="button"
                  onClick={() => setDecisions((prev) => prev.filter((d) => d.id !== decision.id))}
                  className="text-xs font-semibold text-rose-600"
                >
                  Удалить решение
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900">Итоги</h2>
        <textarea
          value={summary ?? ""}
          onChange={(e) => setSummary(e.target.value)}
          className="min-h-[120px] w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          placeholder="Краткое резюме заседания"
        />
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900">Приложения</h2>
        {!canUpload && (
          <p className="text-sm text-zinc-600">Сначала сохраните протокол, чтобы прикреплять файлы.</p>
        )}
        {canUpload && (
          <label className="inline-flex items-center gap-3 rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700">
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(file);
              }}
            />
            <span>{uploading ? "Загрузка..." : "Прикрепить файл"}</span>
          </label>
        )}
        {attachments.length === 0 ? (
          <p className="text-sm text-zinc-600">Нет вложений.</p>
        ) : (
          <div className="space-y-2">
            {attachments.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between rounded-xl border border-zinc-200 px-3 py-2 text-sm">
                <div>
                  <div className="font-semibold text-zinc-900">{a.name}</div>
                  <div className="text-xs text-zinc-600">{(a.size / 1024).toFixed(1)} KB</div>
                </div>
                <div className="flex gap-2">
                  <a href={a.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#5E704F]">
                    Открыть
                  </a>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(a.id)}
                    className="text-xs font-semibold text-rose-600"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
