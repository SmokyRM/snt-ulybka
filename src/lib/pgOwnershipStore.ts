import { sql } from "@/db/client";
import type { OwnershipVerification } from "@/lib/plots";
import type { OwnershipVerificationStore } from "@/lib/ownershipStore";
import { normalizeOwnershipVerification } from "@/lib/normalizeOwnershipVerification";

const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const hasPgConnection = () =>
  Boolean(process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL);

type OwnershipVerificationRow = {
  id: string;
  user_id: string;
  cadastral_number: string;
  document_meta: unknown;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  review_note: string | null;
};

async function readAll(): Promise<OwnershipVerification[]> {
  try {
    const rows = await sql<Array<OwnershipVerificationRow>>`
      SELECT id, user_id, cadastral_number, document_meta, status,
             created_at::text, reviewed_at::text, review_note
      FROM ownership_verifications
      ORDER BY created_at DESC
    `;

    return rows.map((row: OwnershipVerificationRow) => normalizeOwnershipVerification({
      id: row.id,
      userId: row.user_id,
      cadastralNumber: row.cadastral_number,
      documentMeta: (typeof row.document_meta === 'string'
        ? JSON.parse(row.document_meta)
        : row.document_meta) as OwnershipVerification["documentMeta"],
      status: row.status as OwnershipVerification["status"],
      createdAt: row.created_at,
      reviewedAt: row.reviewed_at,
      reviewNote: row.review_note,
    }));
  } catch (error) {
    console.warn("[ownership-store:pg] Failed to read all verifications:", error);
    return [];
  }
}

export function createPgOwnershipStore(): OwnershipVerificationStore {
  return {
    async listAll() {
      return readAll();
    },

    async listByUser(userId: string) {
      if (!userId) return [];
      try {
        const rows = await sql<Array<OwnershipVerificationRow>>`
          SELECT id, user_id, cadastral_number, document_meta, status,
                 created_at::text, reviewed_at::text, review_note
          FROM ownership_verifications
          WHERE user_id = ${userId}
          ORDER BY created_at DESC
        `;

        return rows.map((row: OwnershipVerificationRow) => normalizeOwnershipVerification({
          id: row.id,
          userId: row.user_id,
          cadastralNumber: row.cadastral_number,
          documentMeta: (typeof row.document_meta === 'string'
            ? JSON.parse(row.document_meta)
            : row.document_meta) as OwnershipVerification["documentMeta"],
          status: row.status as OwnershipVerification["status"],
          createdAt: row.created_at,
          reviewedAt: row.reviewed_at,
          reviewNote: row.review_note,
        }));
      } catch (error) {
        console.warn(`[ownership-store:pg] Failed to list verifications for user ${userId}:`, error);
        return [];
      }
    },

    async getByUserAndCadastral(userId: string, cadastralNumber: string) {
      if (!userId || !cadastralNumber) return null;
      try {
        const rows = await sql<OwnershipVerificationRow[]>`
          SELECT id, user_id, cadastral_number, document_meta, status,
                 created_at::text, reviewed_at::text, review_note
          FROM ownership_verifications
          WHERE user_id = ${userId} AND LOWER(cadastral_number) = LOWER(${cadastralNumber})
          LIMIT 1
        `;

        if (!rows.length) return null;
        const row = rows[0];
        return normalizeOwnershipVerification({
          id: row.id,
          userId: row.user_id,
          cadastralNumber: row.cadastral_number,
          documentMeta: (typeof row.document_meta === 'string'
            ? JSON.parse(row.document_meta)
            : row.document_meta) as OwnershipVerification["documentMeta"],
          status: row.status as OwnershipVerification["status"],
          createdAt: row.created_at,
          reviewedAt: row.reviewed_at,
          reviewNote: row.review_note,
        });
      } catch (error) {
        console.warn(`[ownership-store:pg] Failed to get verification for user ${userId}, cadastral ${cadastralNumber}:`, error);
        return null;
      }
    },

    async create(input) {
      const now = new Date().toISOString();
      const record: OwnershipVerification = {
        id: makeId(),
        userId: input.userId,
        cadastralNumber: input.cadastralNumber,
        documentMeta: input.documentMeta,
        status: input.status ?? "sent",
        createdAt: now,
        reviewedAt: null,
        reviewNote: null,
      };

      try {
        await sql`
          INSERT INTO ownership_verifications
            (id, user_id, cadastral_number, document_meta, status, created_at)
          VALUES (
            ${record.id},
            ${record.userId},
            ${record.cadastralNumber},
            ${JSON.stringify(record.documentMeta)}::jsonb,
            ${record.status},
            ${record.createdAt}::timestamptz
          )
        `;
        return record;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create ownership verification";
        console.error("[ownership-store:pg] Create failed:", error);
        throw new Error(message);
      }
    },

    async update(id, patch) {
      try {
        const rows = await sql<OwnershipVerificationRow[]>`
          SELECT id, user_id, cadastral_number, document_meta, status,
                 created_at::text, reviewed_at::text, review_note
          FROM ownership_verifications
          WHERE id = ${id}
        `;

        if (!rows.length) {
          throw new Error("OWNERSHIP_VERIFICATION_NOT_FOUND");
        }

        const existing = normalizeOwnershipVerification({
          id: rows[0].id,
          userId: rows[0].user_id,
          cadastralNumber: rows[0].cadastral_number,
          documentMeta: (typeof rows[0].document_meta === 'string'
            ? JSON.parse(rows[0].document_meta)
            : rows[0].document_meta) as OwnershipVerification["documentMeta"],
          status: rows[0].status as OwnershipVerification["status"],
          createdAt: rows[0].created_at,
          reviewedAt: rows[0].reviewed_at,
          reviewNote: rows[0].review_note,
        });

        const updated = normalizeOwnershipVerification({ ...existing, ...patch });

        await sql`
          UPDATE ownership_verifications
          SET
            status = ${updated.status},
            document_meta = ${JSON.stringify(updated.documentMeta)}::jsonb,
            reviewed_at = ${updated.reviewedAt ? `${updated.reviewedAt}::timestamptz` : null},
            review_note = ${updated.reviewNote}
          WHERE id = ${id}
        `;

        return updated;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update ownership verification";
        console.error("[ownership-store:pg] Update failed:", error);
        throw new Error(message);
      }
    },
  };
}
