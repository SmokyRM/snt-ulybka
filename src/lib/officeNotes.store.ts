import "server-only";

import type { Role } from "@/lib/permissions";

export type OfficeNote = {
  id: string;
  plotId: string;
  text: string;
  authorUserId: string;
  authorRole: Role;
  createdAt: string;
  updatedAt: string;
};

const seedNotes: OfficeNote[] = [
  {
    id: "note1",
    plotId: "p1",
    text: "Владелец просил связаться по поводу начислений за январь",
    authorUserId: "u1",
    authorRole: "secretary",
    createdAt: "2024-01-15T10:00:00.000Z",
    updatedAt: "2024-01-15T10:00:00.000Z",
  },
  {
    id: "note2",
    plotId: "p2",
    text: "Требуется уточнение контактных данных",
    authorUserId: "u2",
    authorRole: "chairman",
    createdAt: "2024-02-01T14:30:00.000Z",
    updatedAt: "2024-02-01T14:30:00.000Z",
  },
];

export function listOfficeNotes(plotId: string): OfficeNote[] {
  return seedNotes
    .filter((note) => note.plotId === plotId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function createOfficeNote(
  plotId: string,
  text: string,
  authorUserId: string,
  authorRole: Role
): OfficeNote {
  const now = new Date().toISOString();
  const note: OfficeNote = {
    id: `note${Date.now().toString(36)}`,
    plotId,
    text,
    authorUserId,
    authorRole,
    createdAt: now,
    updatedAt: now,
  };
  seedNotes.unshift(note);
  return note;
}

export function updateOfficeNote(
  noteId: string,
  text: string,
  authorUserId: string
): OfficeNote | null {
  const idx = seedNotes.findIndex((note) => note.id === noteId);
  if (idx === -1) return null;
  
  const note = seedNotes[idx];
  // Проверка прав: только автор может редактировать
  if (note.authorUserId !== authorUserId) {
    return null;
  }
  
  const updated: OfficeNote = {
    ...note,
    text,
    updatedAt: new Date().toISOString(),
  };
  seedNotes[idx] = updated;
  return updated;
}

export function deleteOfficeNote(noteId: string, authorUserId: string): boolean {
  const idx = seedNotes.findIndex((note) => note.id === noteId);
  if (idx === -1) return false;
  
  const note = seedNotes[idx];
  // Проверка прав: только автор может удалять
  if (note.authorUserId !== authorUserId) {
    return false;
  }
  
  seedNotes.splice(idx, 1);
  return true;
}
