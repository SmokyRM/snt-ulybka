import type { OwnershipVerification } from "@/lib/plots";
import { createJsonOwnershipStore } from "@/lib/jsonOwnershipStore";
import { createKvOwnershipStore } from "@/lib/kvOwnershipStore";
import { createPgOwnershipStore, hasPgConnection } from "@/lib/pgOwnershipStore";

export type OwnershipVerificationPatch = Partial<
  Pick<OwnershipVerification, "status" | "documentMeta" | "reviewedAt" | "reviewNote">
>;

export type OwnershipVerificationStore = {
  listAll: () => Promise<OwnershipVerification[]>;
  listByUser: (userId: string) => Promise<OwnershipVerification[]>;
  getByUserAndCadastral: (
    userId: string,
    cadastralNumber: string,
  ) => Promise<OwnershipVerification | null>;
  create: (input: {
    userId: string;
    cadastralNumber: string;
    documentMeta: OwnershipVerification["documentMeta"];
    status?: OwnershipVerification["status"];
  }) => Promise<OwnershipVerification>;
  update: (id: string, patch: OwnershipVerificationPatch) => Promise<OwnershipVerification>;
};

let store: OwnershipVerificationStore | null = null;

const isProd = process.env.NODE_ENV === "production";
const hasKvVars = () => Boolean(
  process.env.KV_REST_API_URL ||
  process.env.UPSTASH_REDIS_REST_URL
);

function createUnavailableOwnershipStore(reason: string): OwnershipVerificationStore {
  // Log warning instead of crashing
  console.warn(`[ownership-store] Store unavailable: ${reason}. Read operations will return empty results.`);

  return {
    async listAll() {
      console.warn("[ownership-store] listAll called on unavailable store, returning []");
      return [];
    },
    async listByUser() {
      console.warn("[ownership-store] listByUser called on unavailable store, returning []");
      return [];
    },
    async getByUserAndCadastral() {
      console.warn("[ownership-store] getByUserAndCadastral called on unavailable store, returning null");
      return null;
    },
    async create() {
      const error = new Error(`OWNERSHIP_STORE_UNAVAILABLE: ${reason}`);
      console.error("[ownership-store] create called on unavailable store:", error);
      throw error;
    },
    async update() {
      const error = new Error(`OWNERSHIP_STORE_UNAVAILABLE: ${reason}`);
      console.error("[ownership-store] update called on unavailable store:", error);
      throw error;
    },
  };
}

export function getOwnershipStore(): OwnershipVerificationStore {
  if (!store) {
    // Priority: 1) PG (if available), 2) KV (prod with KV vars), 3) JSON (dev), 4) Unavailable
    if (hasPgConnection()) {
      try {
        store = createPgOwnershipStore();
        console.log("[ownership-store] Using Postgres store");
      } catch (error) {
        console.warn("[ownership-store] Failed to create PG store:", error);
        // Fall through to next option
      }
    }

    if (!store && isProd && hasKvVars()) {
      try {
        store = createKvOwnershipStore();
        console.log("[ownership-store] Using KV store");
      } catch (error) {
        console.warn("[ownership-store] Failed to create KV store:", error);
        // Fall through to next option
      }
    }

    if (!store && !isProd) {
      try {
        store = createJsonOwnershipStore();
        console.log("[ownership-store] Using JSON store (dev)");
      } catch (error) {
        console.warn("[ownership-store] Failed to create JSON store:", error);
        // Fall through to unavailable
      }
    }

    // Last resort: unavailable store that returns empty results for reads
    if (!store) {
      const reason = isProd
        ? "No PG or KV configured in production"
        : "Failed to initialize any store";
      store = createUnavailableOwnershipStore(reason);
    }
  }
  return store;
}
