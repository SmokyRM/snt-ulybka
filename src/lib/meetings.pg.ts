import { sql } from "@/db/client";

export type MeetingStatus = "draft" | "published" | "closed" | "archived";
export type MeetingType = "general" | "board" | "extra";

export type Meeting = {
  id: string;
  title: string;
  type: MeetingType;
  status: MeetingStatus;
  startsAt: string | null;
  endsAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
  updatedBy: string | null;
  meta: Record<string, unknown>;
};

export type AgendaItem = {
  id: string;
  meetingId: string;
  position: number;
  title: string;
  description: string | null;
  requiresVote: boolean;
  createdAt: string;
};

export type MeetingMaterial = {
  id: string;
  meetingId: string;
  documentId: string | null;
  title: string;
  visibility: "residents" | "office";
  createdAt: string;
  createdBy: string | null;
};

export type MeetingQuestion = {
  id: string;
  meetingId: string;
  userId: string;
  plotId: string | null;
  question: string;
  status: "new" | "answered" | "hidden";
  answer: string | null;
  createdAt: string;
  answeredAt: string | null;
  answeredBy: string | null;
};

export const hasPgConnection = () =>
  Boolean(process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL);

const mapMeeting = (row: {
  id: string;
  title: string;
  type: MeetingType;
  status: MeetingStatus;
  starts_at: string | null;
  ends_at: string | null;
  published_at: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  meta: Record<string, unknown>;
}): Meeting => ({
  id: row.id,
  title: row.title,
  type: row.type,
  status: row.status,
  startsAt: row.starts_at,
  endsAt: row.ends_at,
  publishedAt: row.published_at,
  createdAt: row.created_at,
  createdBy: row.created_by,
  updatedAt: row.updated_at,
  updatedBy: row.updated_by,
  meta: row.meta ?? {},
});

const mapAgenda = (row: {
  id: string;
  meeting_id: string;
  position: number;
  title: string;
  description: string | null;
  requires_vote: boolean;
  created_at: string;
}): AgendaItem => ({
  id: row.id,
  meetingId: row.meeting_id,
  position: row.position,
  title: row.title,
  description: row.description,
  requiresVote: row.requires_vote,
  createdAt: row.created_at,
});

const mapMaterial = (row: {
  id: string;
  meeting_id: string;
  document_id: string | null;
  title: string;
  visibility: "residents" | "office";
  created_at: string;
  created_by: string | null;
}): MeetingMaterial => ({
  id: row.id,
  meetingId: row.meeting_id,
  documentId: row.document_id,
  title: row.title,
  visibility: row.visibility,
  createdAt: row.created_at,
  createdBy: row.created_by,
});

const mapQuestion = (row: {
  id: string;
  meeting_id: string;
  user_id: string;
  plot_id: string | null;
  question: string;
  status: "new" | "answered" | "hidden";
  answer: string | null;
  created_at: string;
  answered_at: string | null;
  answered_by: string | null;
}): MeetingQuestion => ({
  id: row.id,
  meetingId: row.meeting_id,
  userId: row.user_id,
  plotId: row.plot_id,
  question: row.question,
  status: row.status,
  answer: row.answer,
  createdAt: row.created_at,
  answeredAt: row.answered_at,
  answeredBy: row.answered_by,
});

export async function listMeetings(params?: { status?: MeetingStatus | null; limit?: number; offset?: number }) {
  const conditions = [] as ReturnType<typeof sql>[];
  if (params?.status) conditions.push(sql`status = ${params.status}`);
  const where = conditions.length ? sql`where ${sql.join(conditions, sql` and `)}` : sql``;
  const limit = Math.min(100, Math.max(10, params?.limit ?? 20));
  const offset = Math.max(0, params?.offset ?? 0);
  const rows = await sql<
    Array<{
      id: string;
      title: string;
      type: MeetingType;
      status: MeetingStatus;
      starts_at: string | null;
      ends_at: string | null;
      published_at: string | null;
      created_at: string;
      created_by: string | null;
      updated_at: string;
      updated_by: string | null;
      meta: Record<string, unknown>;
    }>
  >`
    select
      id,
      title,
      type,
      status,
      starts_at::text as starts_at,
      ends_at::text as ends_at,
      published_at::text as published_at,
      created_at::text as created_at,
      created_by,
      updated_at::text as updated_at,
      updated_by,
      meta
    from meetings
    ${where}
    order by created_at desc
    limit ${limit}
    offset ${offset}
  `;
  return rows.map(mapMeeting);
}

export async function listPublishedMeetings(params?: { limit?: number; offset?: number }) {
  const limit = Math.min(100, Math.max(10, params?.limit ?? 20));
  const offset = Math.max(0, params?.offset ?? 0);
  const rows = await sql<
    Array<{
      id: string;
      title: string;
      type: MeetingType;
      status: MeetingStatus;
      starts_at: string | null;
      ends_at: string | null;
      published_at: string | null;
      created_at: string;
      created_by: string | null;
      updated_at: string;
      updated_by: string | null;
      meta: Record<string, unknown>;
    }>
  >`
    select
      id,
      title,
      type,
      status,
      starts_at::text as starts_at,
      ends_at::text as ends_at,
      published_at::text as published_at,
      created_at::text as created_at,
      created_by,
      updated_at::text as updated_at,
      updated_by,
      meta
    from meetings
    where status in ('published', 'closed')
    order by published_at desc nulls last, created_at desc
    limit ${limit}
    offset ${offset}
  `;
  return rows.map(mapMeeting);
}

export async function getMeetingById(id: string): Promise<Meeting | null> {
  const rows = await sql<
    Array<{
      id: string;
      title: string;
      type: MeetingType;
      status: MeetingStatus;
      starts_at: string | null;
      ends_at: string | null;
      published_at: string | null;
      created_at: string;
      created_by: string | null;
      updated_at: string;
      updated_by: string | null;
      meta: Record<string, unknown>;
    }>
  >`
    select
      id,
      title,
      type,
      status,
      starts_at::text as starts_at,
      ends_at::text as ends_at,
      published_at::text as published_at,
      created_at::text as created_at,
      created_by,
      updated_at::text as updated_at,
      updated_by,
      meta
    from meetings
    where id = ${id}
    limit 1
  `;
  return rows[0] ? mapMeeting(rows[0]) : null;
}

export async function createMeeting(input: {
  title: string;
  type: MeetingType;
  startsAt?: string | null;
  endsAt?: string | null;
  createdBy: string | null;
}) {
  const rows = await sql<
    Array<{
      id: string;
      title: string;
      type: MeetingType;
      status: MeetingStatus;
      starts_at: string | null;
      ends_at: string | null;
      published_at: string | null;
      created_at: string;
      created_by: string | null;
      updated_at: string;
      updated_by: string | null;
      meta: Record<string, unknown>;
    }>
  >`
    insert into meetings (title, type, status, starts_at, ends_at, created_by, updated_by)
    values (${input.title}, ${input.type}, 'draft', ${input.startsAt ?? null}, ${input.endsAt ?? null}, ${input.createdBy}, ${input.createdBy})
    returning
      id,
      title,
      type,
      status,
      starts_at::text as starts_at,
      ends_at::text as ends_at,
      published_at::text as published_at,
      created_at::text as created_at,
      created_by,
      updated_at::text as updated_at,
      updated_by,
      meta
  `;
  return mapMeeting(rows[0]);
}

export async function updateMeeting(
  id: string,
  patch: {
    title?: string;
    type?: MeetingType;
    startsAt?: string | null;
    endsAt?: string | null;
    status?: MeetingStatus;
    updatedBy: string | null;
  },
) {
  const rows = await sql<
    Array<{
      id: string;
      title: string;
      type: MeetingType;
      status: MeetingStatus;
      starts_at: string | null;
      ends_at: string | null;
      published_at: string | null;
      created_at: string;
      created_by: string | null;
      updated_at: string;
      updated_by: string | null;
      meta: Record<string, unknown>;
    }>
  >`
    update meetings
    set title = coalesce(${patch.title ?? null}, title),
        type = coalesce(${patch.type ?? null}, type),
        starts_at = ${patch.startsAt ?? null},
        ends_at = ${patch.endsAt ?? null},
        status = coalesce(${patch.status ?? null}, status),
        updated_at = now(),
        updated_by = ${patch.updatedBy}
    where id = ${id}
    returning
      id,
      title,
      type,
      status,
      starts_at::text as starts_at,
      ends_at::text as ends_at,
      published_at::text as published_at,
      created_at::text as created_at,
      created_by,
      updated_at::text as updated_at,
      updated_by,
      meta
  `;
  return rows[0] ? mapMeeting(rows[0]) : null;
}

export async function publishMeeting(id: string, userId: string | null) {
  const rows = await sql<
    Array<{
      id: string;
      title: string;
      type: MeetingType;
      status: MeetingStatus;
      starts_at: string | null;
      ends_at: string | null;
      published_at: string | null;
      created_at: string;
      created_by: string | null;
      updated_at: string;
      updated_by: string | null;
      meta: Record<string, unknown>;
    }>
  >`
    update meetings
    set status = 'published',
        published_at = now(),
        updated_at = now(),
        updated_by = ${userId}
    where id = ${id}
    returning
      id,
      title,
      type,
      status,
      starts_at::text as starts_at,
      ends_at::text as ends_at,
      published_at::text as published_at,
      created_at::text as created_at,
      created_by,
      updated_at::text as updated_at,
      updated_by,
      meta
  `;
  return rows[0] ? mapMeeting(rows[0]) : null;
}

export async function closeMeeting(id: string, userId: string | null) {
  const rows = await sql<
    Array<{
      id: string;
      title: string;
      type: MeetingType;
      status: MeetingStatus;
      starts_at: string | null;
      ends_at: string | null;
      published_at: string | null;
      created_at: string;
      created_by: string | null;
      updated_at: string;
      updated_by: string | null;
      meta: Record<string, unknown>;
    }>
  >`
    update meetings
    set status = 'closed',
        updated_at = now(),
        updated_by = ${userId}
    where id = ${id}
    returning
      id,
      title,
      type,
      status,
      starts_at::text as starts_at,
      ends_at::text as ends_at,
      published_at::text as published_at,
      created_at::text as created_at,
      created_by,
      updated_at::text as updated_at,
      updated_by,
      meta
  `;
  return rows[0] ? mapMeeting(rows[0]) : null;
}

export async function listAgendaItems(meetingId: string): Promise<AgendaItem[]> {
  const rows = await sql<
    Array<{
      id: string;
      meeting_id: string;
      position: number;
      title: string;
      description: string | null;
      requires_vote: boolean;
      created_at: string;
    }>
  >`
    select
      id,
      meeting_id,
      position,
      title,
      description,
      requires_vote,
      created_at::text as created_at
    from meeting_agenda_items
    where meeting_id = ${meetingId}
    order by position asc
  `;
  return rows.map(mapAgenda);
}

export async function replaceAgendaItems(meetingId: string, items: Array<Omit<AgendaItem, "id" | "createdAt">>) {
  await sql`delete from meeting_agenda_items where meeting_id = ${meetingId}`;
  if (!items.length) return [];
  const payload = items.map((item, idx) => ({
    meeting_id: meetingId,
    position: item.position ?? idx,
    title: item.title,
    description: item.description ?? null,
    requires_vote: item.requiresVote ?? false,
  }));
  const rows = await sql<
    Array<{
      id: string;
      meeting_id: string;
      position: number;
      title: string;
      description: string | null;
      requires_vote: boolean;
      created_at: string;
    }>
  >`
    insert into meeting_agenda_items ${sql(payload, "meeting_id", "position", "title", "description", "requires_vote")}
    returning id, meeting_id, position, title, description, requires_vote, created_at::text as created_at
  `;
  return rows.map(mapAgenda);
}

export async function listMaterials(meetingId: string, visibility?: "residents" | "office") {
  const where = visibility
    ? sql`where meeting_id = ${meetingId} and visibility = ${visibility}`
    : sql`where meeting_id = ${meetingId}`;
  const rows = await sql<
    Array<{
      id: string;
      meeting_id: string;
      document_id: string | null;
      title: string;
      visibility: "residents" | "office";
      created_at: string;
      created_by: string | null;
    }>
  >`
    select
      id,
      meeting_id,
      document_id,
      title,
      visibility,
      created_at::text as created_at,
      created_by
    from meeting_materials
    ${where}
    order by created_at desc
  `;
  return rows.map(mapMaterial);
}

export async function addMaterial(input: {
  meetingId: string;
  documentId: string | null;
  title: string;
  visibility: "residents" | "office";
  createdBy: string | null;
}) {
  const rows = await sql<
    Array<{
      id: string;
      meeting_id: string;
      document_id: string | null;
      title: string;
      visibility: "residents" | "office";
      created_at: string;
      created_by: string | null;
    }>
  >`
    insert into meeting_materials (meeting_id, document_id, title, visibility, created_by)
    values (${input.meetingId}, ${input.documentId}, ${input.title}, ${input.visibility}, ${input.createdBy})
    returning
      id,
      meeting_id,
      document_id,
      title,
      visibility,
      created_at::text as created_at,
      created_by
  `;
  return rows[0] ? mapMaterial(rows[0]) : null;
}

export async function listQuestions(meetingId: string, includeHidden = false) {
  const where = includeHidden
    ? sql`where meeting_id = ${meetingId}`
    : sql`where meeting_id = ${meetingId} and status <> 'hidden'`;
  const rows = await sql<
    Array<{
      id: string;
      meeting_id: string;
      user_id: string;
      plot_id: string | null;
      question: string;
      status: "new" | "answered" | "hidden";
      answer: string | null;
      created_at: string;
      answered_at: string | null;
      answered_by: string | null;
    }>
  >`
    select
      id,
      meeting_id,
      user_id,
      plot_id,
      question,
      status,
      answer,
      created_at::text as created_at,
      answered_at::text as answered_at,
      answered_by
    from meeting_questions
    ${where}
    order by created_at desc
  `;
  return rows.map(mapQuestion);
}

export async function createQuestion(input: {
  meetingId: string;
  userId: string;
  plotId: string | null;
  question: string;
}) {
  const rows = await sql<
    Array<{
      id: string;
      meeting_id: string;
      user_id: string;
      plot_id: string | null;
      question: string;
      status: "new" | "answered" | "hidden";
      answer: string | null;
      created_at: string;
      answered_at: string | null;
      answered_by: string | null;
    }>
  >`
    insert into meeting_questions (meeting_id, user_id, plot_id, question, status)
    values (${input.meetingId}, ${input.userId}, ${input.plotId}, ${input.question}, 'new')
    returning
      id,
      meeting_id,
      user_id,
      plot_id,
      question,
      status,
      answer,
      created_at::text as created_at,
      answered_at::text as answered_at,
      answered_by
  `;
  return rows[0] ? mapQuestion(rows[0]) : null;
}

export async function answerQuestion(input: {
  id: string;
  status: "answered" | "hidden";
  answer: string | null;
  answeredBy: string | null;
}) {
  const rows = await sql<
    Array<{
      id: string;
      meeting_id: string;
      user_id: string;
      plot_id: string | null;
      question: string;
      status: "new" | "answered" | "hidden";
      answer: string | null;
      created_at: string;
      answered_at: string | null;
      answered_by: string | null;
    }>
  >`
    update meeting_questions
    set status = ${input.status},
        answer = ${input.answer},
        answered_at = now(),
        answered_by = ${input.answeredBy}
    where id = ${input.id}
    returning
      id,
      meeting_id,
      user_id,
      plot_id,
      question,
      status,
      answer,
      created_at::text as created_at,
      answered_at::text as answered_at,
      answered_by
  `;
  return rows[0] ? mapQuestion(rows[0]) : null;
}
