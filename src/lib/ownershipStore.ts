import type { OwnershipVerification } from "@/lib/plots";
import { createJsonOwnershipStore } from "@/lib/jsonOwnershipStore";
import { createKvOwnershipStore } from "@/lib/kvOwnershipStore";

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
  update: (input: {
    id: string;
    status: OwnershipVerification["status"];
    reviewNote?: string | null;
    reviewerId?: string | null;
  }) => Promise<OwnershipVerification | null>;
};

let store: OwnershipVerificationStore | null = null;

const isProd = process.env.NODE_ENV === "production";

function createUnavailableOwnershipStore(reason: string): OwnershipVerificationStore {
  const error = new Error(reason);
  return {
    async listAll() {
      return [];
    },
    async listByUser() {
      return [];
    },
    async getByUserAndCadastral() {
      return null;
    },
    async create() {
      throw error;
    },
    async update() {
      throw error;
    },
  };
}

export function getOwnershipStore(): OwnershipVerificationStore {
  if (!store) {
    if (isProd) {
      try {
        store = createKvOwnershipStore();
      } catch {
        store = createUnavailableOwnershipStore("OWNERSHIP_STORE_UNCONFIGURED");
      }
    } else {
      store = createJsonOwnershipStore();
    }
  }
  return store;
}
