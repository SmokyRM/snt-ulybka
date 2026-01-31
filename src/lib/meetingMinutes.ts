import fs from "fs/promises";
import path from "path";
import { isServerlessReadonlyFs, warnReadonlyFs } from "@/lib/fsGuard";

export type MeetingAgendaItem = {
  id: string;
  title: string;
  presenter?: string | null;
  notes?: string | null;
};

export type MeetingVoteOption = {
  option: string;
  votes: number;
};

export type MeetingVote = {
  id: string;
  question: string;
  options: MeetingVoteOption[];
  result: string;
  notes?: string | null;
};

export type MeetingDecision = {
  id: string;
  title: string;
  category?: string | null;
  status?: "approved" | "rejected" | "postponed";
  outcome?: string | null;
  voteId?: string | null;
  responsible?: string | null;
  dueDate?: string | null;
};

export type MeetingAttachment = {
  id: string;
  name: string;
  url: string;
  mime: string;
  size: number;
};

export type MeetingMinutes = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  location?: string | null;
  attendees?: string | null;
  agenda: MeetingAgendaItem[];
  votes: MeetingVote[];
  decisions: MeetingDecision[];
  summary?: string | null;
  attachments: MeetingAttachment[];
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
  createdByUserId: string | null;
  updatedByUserId: string | null;
};

export type DecisionRegistryRow = {
  id: string;
  meetingId: string;
  meetingTitle: string;
  meetingDate: string;
  title: string;
  category?: string | null;
  status?: "approved" | "rejected" | "postponed";
  outcome?: string | null;
  docUrl: string;
};

const filePath = path.join(process.cwd(), "data", "meeting-minutes.json");

const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

async function writeMinutes(items: MeetingMinutes[]) {
  if (isServerlessReadonlyFs()) {
    warnReadonlyFs("meeting-minutes:write");
    return;
  }
  const tmp = `${filePath}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(items, null, 2), "utf-8");
  await fs.rename(tmp, filePath);
}

async function readMinutes(): Promise<MeetingMinutes[]> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as MeetingMinutes[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    if (isServerlessReadonlyFs()) {
      warnReadonlyFs("meeting-minutes:read-fallback");
      return [];
    }
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await writeMinutes([]);
    return [];
  }
}

export async function listMeetingMinutes(): Promise<MeetingMinutes[]> {
  return readMinutes();
}

export async function getMeetingMinutesById(id: string): Promise<MeetingMinutes | null> {
  const items = await readMinutes();
  return items.find((item) => item.id === id) ?? null;
}

export async function createMeetingMinutes(input: {
  title: string;
  date: string;
  location?: string | null;
  attendees?: string | null;
  agenda?: MeetingAgendaItem[];
  votes?: MeetingVote[];
  decisions?: MeetingDecision[];
  summary?: string | null;
  attachments?: MeetingAttachment[];
  status?: MeetingMinutes["status"];
  createdByUserId: string | null;
}): Promise<MeetingMinutes> {
  const now = new Date().toISOString();
  const item: MeetingMinutes = {
    id: makeId(),
    title: input.title,
    date: input.date,
    location: input.location ?? null,
    attendees: input.attendees ?? null,
    agenda: input.agenda ?? [],
    votes: input.votes ?? [],
    decisions: input.decisions ?? [],
    summary: input.summary ?? null,
    attachments: input.attachments ?? [],
    status: input.status ?? "draft",
    createdAt: now,
    updatedAt: now,
    createdByUserId: input.createdByUserId,
    updatedByUserId: input.createdByUserId,
  };
  const items = await readMinutes();
  items.unshift(item);
  await writeMinutes(items);
  return item;
}

export async function updateMeetingMinutes(
  id: string,
  patch: Partial<Omit<MeetingMinutes, "id" | "createdAt" | "createdByUserId">> & { updatedByUserId: string | null }
): Promise<MeetingMinutes | null> {
  const items = await readMinutes();
  const idx = items.findIndex((item) => item.id === id);
  if (idx === -1) return null;
  const updated: MeetingMinutes = {
    ...items[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
    updatedByUserId: patch.updatedByUserId ?? items[idx].updatedByUserId,
  };
  items[idx] = updated;
  await writeMinutes(items);
  return updated;
}

export async function deleteMeetingMinutes(id: string): Promise<boolean> {
  const items = await readMinutes();
  const next = items.filter((item) => item.id !== id);
  if (next.length === items.length) return false;
  await writeMinutes(next);
  return true;
}

export async function addMinutesAttachment(
  id: string,
  attachment: MeetingAttachment,
  updatedByUserId: string | null
): Promise<MeetingMinutes | null> {
  const item = await getMeetingMinutesById(id);
  if (!item) return null;
  const nextAttachments = [attachment, ...(item.attachments ?? [])];
  return updateMeetingMinutes(id, { attachments: nextAttachments, updatedByUserId });
}

export async function removeMinutesAttachment(
  id: string,
  attachmentId: string,
  updatedByUserId: string | null
): Promise<MeetingMinutes | null> {
  const item = await getMeetingMinutesById(id);
  if (!item) return null;
  const nextAttachments = (item.attachments ?? []).filter((a) => a.id !== attachmentId);
  return updateMeetingMinutes(id, { attachments: nextAttachments, updatedByUserId });
}

export async function listDecisionRegistry(filters?: {
  q?: string | null;
  status?: string | null;
  category?: string | null;
  from?: string | null;
  to?: string | null;
}): Promise<DecisionRegistryRow[]> {
  const items = await readMinutes();
  const rows: DecisionRegistryRow[] = [];

  items.forEach((meeting) => {
    (meeting.decisions ?? []).forEach((decision) => {
      rows.push({
        id: decision.id,
        meetingId: meeting.id,
        meetingTitle: meeting.title,
        meetingDate: meeting.date,
        title: decision.title,
        category: decision.category ?? null,
        status: decision.status,
        outcome: decision.outcome ?? null,
        docUrl: `/api/office/meetings/${meeting.id}/export.pdf`,
      });
    });
  });

  let filtered = rows;
  if (filters?.q) {
    const q = filters.q.toLowerCase();
    filtered = filtered.filter(
      (row) =>
        row.title.toLowerCase().includes(q) ||
        row.meetingTitle.toLowerCase().includes(q) ||
        (row.category?.toLowerCase().includes(q) ?? false)
    );
  }
  if (filters?.status) {
    filtered = filtered.filter((row) => row.status === filters.status);
  }
  if (filters?.category) {
    filtered = filtered.filter((row) => row.category === filters.category);
  }
  if (filters?.from) {
    filtered = filtered.filter((row) => row.meetingDate >= filters.from!);
  }
  if (filters?.to) {
    filtered = filtered.filter((row) => row.meetingDate <= filters.to!);
  }

  return filtered.sort((a, b) => (a.meetingDate < b.meetingDate ? 1 : -1));
}
