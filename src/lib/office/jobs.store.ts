import { createId } from "@/lib/mockDb";

export type OfficeJobStatus = "queued" | "running" | "done" | "failed";
export type OfficeJobType =
  | "receipts.batch"
  | "receipts.batchPdf"
  | "payments.import.csv"
  | "payments.import.xlsx"
  | "billing.importStatement"
  | "reports.monthlyPdfBatch"
  | "notifications.campaignSend";

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

export function createOfficeJob(input: {
  type: OfficeJobType;
  payload: Record<string, unknown>;
  createdBy?: string | null;
  requestId?: string | null;
  maxAttempts?: number;
}): OfficeJob {
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

export function getOfficeJob(id: string): OfficeJob | null {
  const db = getOfficeJobsDb();
  return db.jobs.find((job) => job.id === id) ?? null;
}

export function listOfficeJobs(limit = 50): OfficeJob[] {
  const db = getOfficeJobsDb();
  return [...db.jobs].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, limit);
}

export function listOfficeJobsAll(): OfficeJob[] {
  const db = getOfficeJobsDb();
  return [...db.jobs].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function countOfficeJobs(): number {
  return getOfficeJobsDb().jobs.length;
}

export function updateOfficeJob(id: string, updates: Partial<OfficeJob>): OfficeJob | null {
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
