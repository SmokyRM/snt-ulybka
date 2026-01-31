/**
 * Penalty Accruals Store
 * Sprint 23: Production mode with metadata, void/freeze, and audit
 */

import { createId } from "@/lib/mockDb";

export type PenaltyAccrualStatus = "active" | "voided" | "frozen";

export interface PenaltyAccrualMetadata {
  asOf: string; // ISO date when penalty was calculated
  ratePerDay: number; // Daily rate (e.g., 0.1/365)
  baseDebt: number; // Original debt amount used for calculation
  daysOverdue: number; // Days overdue at calculation time
  policyVersion: string; // Version of penalty policy used
}

export interface PenaltyAccrual {
  id: string;
  plotId: string;
  period: string; // YYYY-MM
  amount: number;
  status: PenaltyAccrualStatus;
  metadata: PenaltyAccrualMetadata;
  linkedChargeId: string | null; // Reference to billing.store charge
  voidedBy: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  frozenBy: string | null;
  frozenAt: string | null;
  freezeReason: string | null;
  unfrozenBy: string | null;
  unfrozenAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PenaltyAccrualInput {
  plotId: string;
  period: string;
  amount: number;
  metadata: PenaltyAccrualMetadata;
  linkedChargeId?: string | null;
  createdBy: string;
}

interface PenaltyAccrualsDb {
  accruals: PenaltyAccrual[];
}

const getPenaltyAccrualsDb = (): PenaltyAccrualsDb => {
  const g = globalThis as typeof globalThis & { __SNT_PENALTY_ACCRUALS_DB__?: PenaltyAccrualsDb };
  if (!g.__SNT_PENALTY_ACCRUALS_DB__) {
    g.__SNT_PENALTY_ACCRUALS_DB__ = {
      accruals: [],
    };
  }
  return g.__SNT_PENALTY_ACCRUALS_DB__;
};

// Current penalty policy version
export const PENALTY_POLICY_VERSION = "v1.0";

/**
 * Create a new penalty accrual
 * Enforces uniqueness per (plotId, period)
 */
export function createPenaltyAccrual(input: PenaltyAccrualInput): PenaltyAccrual {
  const db = getPenaltyAccrualsDb();
  const now = new Date().toISOString();

  // Check for duplicate (plotId, period) - only check active/frozen, not voided
  const existing = db.accruals.find(
    (a) => a.plotId === input.plotId && a.period === input.period && a.status !== "voided"
  );
  if (existing) {
    throw new Error(`Penalty accrual already exists for plot ${input.plotId}, period ${input.period}`);
  }

  const accrual: PenaltyAccrual = {
    id: createId("penalty"),
    plotId: input.plotId,
    period: input.period,
    amount: input.amount,
    status: "active",
    metadata: input.metadata,
    linkedChargeId: input.linkedChargeId ?? null,
    voidedBy: null,
    voidedAt: null,
    voidReason: null,
    frozenBy: null,
    frozenAt: null,
    freezeReason: null,
    unfrozenBy: null,
    unfrozenAt: null,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  };

  db.accruals.push(accrual);
  return accrual;
}

/**
 * Get a penalty accrual by ID
 */
export function getPenaltyAccrual(id: string): PenaltyAccrual | null {
  const db = getPenaltyAccrualsDb();
  return db.accruals.find((a) => a.id === id) ?? null;
}

/**
 * Find existing penalty accrual by plotId and period (active or frozen only)
 */
export function findPenaltyAccrualByPlotPeriod(plotId: string, period: string): PenaltyAccrual | null {
  const db = getPenaltyAccrualsDb();
  return db.accruals.find(
    (a) => a.plotId === plotId && a.period === period && a.status !== "voided"
  ) ?? null;
}

/**
 * List penalty accruals with filters
 */
export function listPenaltyAccruals(filters?: {
  plotId?: string | null;
  period?: string | null;
  status?: PenaltyAccrualStatus | null;
  asOf?: string | null;
}): PenaltyAccrual[] {
  const db = getPenaltyAccrualsDb();
  let result = [...db.accruals];

  if (filters?.plotId) {
    result = result.filter((a) => a.plotId === filters.plotId);
  }
  if (filters?.period) {
    result = result.filter((a) => a.period === filters.period);
  }
  if (filters?.status) {
    result = result.filter((a) => a.status === filters.status);
  }
  if (filters?.asOf) {
    result = result.filter((a) => a.metadata.asOf === filters.asOf);
  }

  return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Update a penalty accrual
 */
export function updatePenaltyAccrual(
  id: string,
  updates: Partial<Omit<PenaltyAccrual, "id" | "createdAt" | "createdBy">>
): PenaltyAccrual | null {
  const db = getPenaltyAccrualsDb();
  const index = db.accruals.findIndex((a) => a.id === id);
  if (index === -1) return null;

  db.accruals[index] = {
    ...db.accruals[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  return db.accruals[index];
}

/**
 * Void a penalty accrual
 */
export function voidPenaltyAccrual(
  id: string,
  userId: string,
  reason: string
): PenaltyAccrual | null {
  const accrual = getPenaltyAccrual(id);
  if (!accrual) return null;

  if (accrual.status === "voided") {
    throw new Error("Penalty accrual is already voided");
  }

  return updatePenaltyAccrual(id, {
    status: "voided",
    voidedBy: userId,
    voidedAt: new Date().toISOString(),
    voidReason: reason,
  });
}

/**
 * Freeze a penalty accrual (prevents recalc)
 */
export function freezePenaltyAccrual(
  id: string,
  userId: string,
  reason: string
): PenaltyAccrual | null {
  const accrual = getPenaltyAccrual(id);
  if (!accrual) return null;

  if (accrual.status === "voided") {
    throw new Error("Cannot freeze a voided penalty accrual");
  }
  if (accrual.status === "frozen") {
    throw new Error("Penalty accrual is already frozen");
  }

  return updatePenaltyAccrual(id, {
    status: "frozen",
    frozenBy: userId,
    frozenAt: new Date().toISOString(),
    freezeReason: reason,
  });
}

/**
 * Unfreeze a penalty accrual
 */
export function unfreezePenaltyAccrual(
  id: string,
  userId: string
): PenaltyAccrual | null {
  const accrual = getPenaltyAccrual(id);
  if (!accrual) return null;

  if (accrual.status !== "frozen") {
    throw new Error("Penalty accrual is not frozen");
  }

  return updatePenaltyAccrual(id, {
    status: "active",
    unfrozenBy: userId,
    unfrozenAt: new Date().toISOString(),
  });
}

/**
 * Unvoid a penalty accrual (restore it)
 */
export function unvoidPenaltyAccrual(
  id: string,
  userId: string
): PenaltyAccrual | null {
  const accrual = getPenaltyAccrual(id);
  if (!accrual) return null;

  if (accrual.status !== "voided") {
    throw new Error("Penalty accrual is not voided");
  }

  // Check if there's another active/frozen accrual for the same plot/period
  const existing = findPenaltyAccrualByPlotPeriod(accrual.plotId, accrual.period);
  if (existing && existing.id !== id) {
    throw new Error(`Another active penalty accrual exists for plot ${accrual.plotId}, period ${accrual.period}`);
  }

  return updatePenaltyAccrual(id, {
    status: "active",
    voidedBy: null,
    voidedAt: null,
    voidReason: null,
  });
}

/**
 * Recalculate penalty amount for an existing accrual
 * Skips frozen and voided accruals
 */
export function recalcPenaltyAccrual(
  id: string,
  newAmount: number,
  newMetadata: PenaltyAccrualMetadata
): PenaltyAccrual | null {
  const accrual = getPenaltyAccrual(id);
  if (!accrual) return null;

  if (accrual.status === "frozen") {
    throw new Error("Cannot recalc frozen penalty accrual");
  }
  if (accrual.status === "voided") {
    throw new Error("Cannot recalc voided penalty accrual");
  }

  return updatePenaltyAccrual(id, {
    amount: newAmount,
    metadata: newMetadata,
  });
}

/**
 * Get summary of penalty accruals
 */
export function getPenaltyAccrualsSummary(filters?: { period?: string }): {
  total: number;
  active: number;
  frozen: number;
  voided: number;
  totalAmount: number;
  activeAmount: number;
} {
  const accruals = listPenaltyAccruals({ period: filters?.period });

  return {
    total: accruals.length,
    active: accruals.filter((a) => a.status === "active").length,
    frozen: accruals.filter((a) => a.status === "frozen").length,
    voided: accruals.filter((a) => a.status === "voided").length,
    totalAmount: accruals.reduce((sum, a) => sum + a.amount, 0),
    activeAmount: accruals.filter((a) => a.status === "active").reduce((sum, a) => sum + a.amount, 0),
  };
}

/**
 * Create or update penalty accrual (upsert by plotId + period)
 */
export function upsertPenaltyAccrual(input: PenaltyAccrualInput): {
  accrual: PenaltyAccrual;
  action: "created" | "updated" | "skipped";
  skipReason?: string;
} {
  const existing = findPenaltyAccrualByPlotPeriod(input.plotId, input.period);

  if (existing) {
    if (existing.status === "frozen") {
      return { accrual: existing, action: "skipped", skipReason: "frozen" };
    }
    // Update existing
    const updated = updatePenaltyAccrual(existing.id, {
      amount: input.amount,
      metadata: input.metadata,
      linkedChargeId: input.linkedChargeId ?? existing.linkedChargeId,
    });
    return { accrual: updated!, action: "updated" };
  }

  // Create new
  const created = createPenaltyAccrual(input);
  return { accrual: created, action: "created" };
}
