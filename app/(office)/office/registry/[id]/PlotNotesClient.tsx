"use client";

import { useState } from "react";
import type { OfficeNote } from "@/lib/officeNotes.store";
import { apiPost } from "@/lib/api/client";

type Props = {
  plotId: string;
  initialNotes: OfficeNote[];
};

export default function PlotNotesClient({ plotId, initialNotes }: Props) {
  const [notes, setNotes] = useState(initialNotes);
  const [isAdding, setIsAdding] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");

  const handleAddNote = async () => {
    if (!newNoteText.trim()) return;

    try {
      const data = await apiPost<{ note: OfficeNote }>(`/api/office/registry/${plotId}/notes`, { text: newNoteText });
      setNotes([data.note, ...notes]);
      setNewNoteText("");
      setIsAdding(false);
    } catch (error) {
      // Игнорируем ошибки
    }
  };

  if (notes.length === 0 && !isAdding) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center" data-testid="plot-notes-empty">
          <p className="text-sm text-zinc-600 mb-3">Нет заметок сотрудников</p>
          <button
            onClick={() => setIsAdding(true)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            data-testid="plot-notes-add-first"
          >
            Добавить заметку
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="plot-notes-list">
      {/* Форма добавления заметки */}
      {isAdding && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4" data-testid="plot-notes-form">
          <textarea
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            placeholder="Введите заметку..."
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-[#5E704F] focus:outline-none"
            rows={3}
            data-testid="plot-notes-textarea"
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleAddNote}
              disabled={!newNoteText.trim()}
              className="rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4d5d41] disabled:opacity-50"
              data-testid="plot-notes-save"
            >
              Сохранить
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewNoteText("");
              }}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              data-testid="plot-notes-cancel"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Список заметок */}
      {notes.map((note) => (
        <div
          key={note.id}
          className="rounded-lg border border-zinc-200 bg-white p-4"
          data-testid={`plot-note-${note.id}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-sm text-zinc-900 whitespace-pre-line">{note.text}</p>
              <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                <span data-testid={`plot-note-author-${note.id}`}>{note.authorRole}</span>
                <span>•</span>
                <span data-testid={`plot-note-date-${note.id}`}>
                  {new Date(note.createdAt).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Кнопка добавления */}
      {!isAdding && (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
          data-testid="plot-notes-add"
        >
          + Добавить заметку
        </button>
      )}
    </div>
  );
}
