import { createId } from "@/lib/mockDb";
import { sql } from "@/db/client";

export type OfficeJobStatus = "queued" | "running" | "done" | "failed";
export type OfficeJobType =
  | "receipts.batch"
  | "receipts.batchPdf"
  | "payments.import.csv"
  | "payments.import.xlsx"
  | "billing.importStatement"
  | "reports.monthlyPdfBatch"
  | "notifications.campaignSend"
  | "notifications.send";

export type OfficeJob = {
  id: string;
  type: OfficeJobType;
  status: OfficeJobStatus;
  progress: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  requestId: string | null;
  payload: Record<string, unknown>;
  resultUrl: string | null;
  resultData: Record<string, unknown> | null;
  error: string | null;
  attempts: number;
  maxAttempts: number;
};

type OfficeJobsDb = {
  jobs: OfficeJob[];
};

const getOfficeJobsDb = (): OfficeJobsDb => {
  const g = globalThis as typeof globalThis & { __SNT_OFFICE_JOBS_DB__?: OfficeJobsDb };
  if (!g.__SNT_OFFICE_JOBS_DB__) {
    g.__SNT_OFFICE_JOBS_DB__ = { jobs: [] };
  }
  return g.__SNT_OFFICE_JOBS_DB__;
};

const hasPgConnection = () =>
  Boolean(process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL);

const mapRow = (row: {
  id: string;
  type: OfficeJobType;
  status: OfficeJobStatus;
  progress: number;
  payload: Record<string, unknown>;
  result_url: string | null;
  result_data: Record<string, unknown> | null;
  error: string | null;
  attempts: number;
  max_attempts: number;
  created_by: string | null;
  request_id: string | null;
  created_at: string;
  updated_at: string;
}): OfficeJob => ({
  id: row.id,
  type: row.type,
  status: row.status,
  progress: row.progress,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  createdBy: row.created_by,
  requestId: row.request_id ?? null,
  payload: row.payload ?? {},
  resultUrl: row.result_url ?? null,
  resultData: row.result_data ?? null,
  error: row.error ?? null,
  attempts: row.attempts ?? 0,
  maxAttempts: row.max_attempts ?? 2,
});

export async function createOfficeJob(input: {
  type: OfficeJobType;
  payload: Record<string, unknown>;
  createdBy?: string | null;
  requestId?: string | null;
  maxAttempts?: number;
}): Promise<OfficeJob> {
  if (!hasPgConnection()) {
    const db = getOfficeJobsDb();
    const now = new Date().toISOString();
    const job: OfficeJob = {
      id: createId("job"),
      type: input.type,
      status: "queued",
      progress: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy ?? null,
      requestId: input.requestId ?? null,
      payload: input.payload,
      resultUrl: null,
      resultData: null,
      error: null,
      attempts: 0,
      maxAttempts: input.maxAttempts ?? 2,
    };
    db.jobs.push(job);
    return job;
  }

  const rows = await sql<
    Array<{
      id: string;
      type: OfficeJobType;
      status: OfficeJobStatus;
      progress: number;
      payload: Record<string, unknown>;
      result_url: string | null;
      result_data: Record<string, unknown> | null;
      error: string | null;
      attempts: number;
      max_attempts: number;
      created_by: string | null;
      request_id: string | null;
      created_at: string;
      updated_at: string;
    }>
  >`
    insert into office_jobs (type, status, progress, payload, result_url, result_data, error, attempts, max_attempts, created_by, request_id)
    values (${input.type}, 'queued', 0, ${input.payload}, null, null, null, 0, ${input.maxAttempts ?? 2}, ${input.createdBy ?? null}, ${input.requestId ?? null})
    returning *
  `;
  return mapRow(rows[0]);
}

export async function getOfficeJob(id: string): Promise<OfficeJob | null> {
  if (!hasPgConnection()) {
    const db = getOfficeJobsDb();
    return db.jobs.find((job) => job.id === id) ?? null;
  }
  const rows = await sql<
    Array<{
      id: string;
      type: OfficeJobType;
      status: OfficeJobStatus;
      progress: number;
      payload: Record<string, unknown>;
      result_url: string | null;
      result_data: Record<string, unknown> | null;
      error: string | null;
      attempts: number;
      max_attempts: number;
      created_by: string | null;
      request_id: string | null;
      created_at: string;
      updated_at: string;
    }>
  >`
    select *
    from office_jobs
    where id = ${id}
    limit 1
  `;
  const row = rows[0];
  return row ? mapRow(row) : null;
}

export async function listOfficeJobs(limit = 50): Promise<OfficeJob[]> {
  if (!hasPgConnection()) {
    const db = getOfficeJobsDb();
    return [...db.jobs].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, limit);
  }
  const rows = await sql<
    Array<{
      id: string;
      type: OfficeJobType;
      status: OfficeJobStatus;
      progress: number;
      payload: Record<string, unknown>;
      result_url: string | null;
      result_data: Record<string, unknown> | null;
      error: string | null;
      attempts: number;
      max_attempts: number;
      created_by: string | null;
      request_id: string | null;
      created_at: string;
      updated_at: string;
    }>
  >`
    select *
    from office_jobs
    order by created_at desc
    limit ${limit}
  `;
  return rows.map(mapRow);
}

export async function listOfficeJobsAll(): Promise<OfficeJob[]> {
  if (!hasPgConnection()) {
    const db = getOfficeJobsDb();
    return [...db.jobs].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }
  const rows = await sql<
    Array<{
      id: string;
      type: OfficeJobType;
      status: OfficeJobStatus;
      progress: number;
      payload: Record<string, unknown>;
      result_url: string | null;
      result_data: Record<string, unknown> | null;
      error: string | null;
      attempts: number;
      max_attempts: number;
      created_by: string | null;
      request_id: string | null;
      created_at: string;
      updated_at: string;
    }>
  >`
    select *
    from office_jobs
    order by created_at desc
  `;
  return rows.map(mapRow);
}

export async function countOfficeJobs(): Promise<number> {
  if (!hasPgConnection()) {
    return getOfficeJobsDb().jobs.length;
  }
  const rows = await sql<Array<{ total: number }>>`
    select count(*)::int as total from office_jobs
  `;
  return rows[0]?.total ?? 0;
}

export async function updateOfficeJob(id: string, updates: Partial<OfficeJob>): Promise<OfficeJob | null> {
  if (!hasPgConnection()) {
    const db = getOfficeJobsDb();
    const idx = db.jobs.findIndex((job) => job.id === id);
    if (idx === -1) return null;
    const updated: OfficeJob = {
      ...db.jobs[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    db.jobs[idx] = updated;
    return updated;
  }

  const payload = updates.payload !== undefined ? updates.payload : undefined;
  const resultData = updates.resultData !== undefined ? updates.resultData : undefined;
  const rows = await sql<
    Array<{
      id: string;
      type: OfficeJobType;
      status: OfficeJobStatus;
      progress: number;
      payload: Record<string, unknown>;
      result_url: string | null;
      result_data: Record<string, unknown> | null;
      error: string | null;
      attempts: number;
      max_attempts: number;
      created_by: string | null;
      request_id: string | null;
      created_at: string;
      updated_at: string;
    }>
  >`
    update office_jobs
    set
      status = coalesce(${updates.status ?? null}, status),
      progress = coalesce(${updates.progress ?? null}, progress),
      payload = coalesce(${payload ?? null}, payload),
      result_url = coalesce(${updates.resultUrl ?? null}, result_url),
      result_data = coalesce(${resultData ?? null}, result_data),
      error = coalesce(${updates.error ?? null}, error),
      attempts = coalesce(${updates.attempts ?? null}, attempts),
      max_attempts = coalesce(${updates.maxAttempts ?? null}, max_attempts),
      updated_at = now()
    where id = ${id}
    returning *
  `;
  const row = rows[0];
  return row ? mapRow(row) : null;
}
