/**
 * Requisites Store
 * Sprint 31: Versioned payment requisites storage
 */

export type Requisites = {
  id: string;
  title: string;
  bankName: string;
  bik: string;
  account: string;
  corrAccount: string;
  inn: string;
  kpp: string;
  recipientName: string;
  purposeTemplate: string;
  updatedAt: string;
  version: number;
  isActive: boolean;
};

// In-memory store with versioned history (append-only)
const requisitesHistory: Requisites[] = [];

// Seed initial requisites from existing config
const INITIAL_REQUISITES: Omit<Requisites, "id" | "updatedAt" | "version"> = {
  title: "Основные реквизиты СНТ",
  bankName: "ПАО «Челиндбанк»",
  bik: "047501711",
  account: "40703810407950000058",
  corrAccount: "30101810400000000711",
  inn: "7423007708",
  kpp: "745901001",
  recipientName: "СК «Улыбка»",
  purposeTemplate: "Членский взнос за участок {plot}, {period}. {name}",
  isActive: true,
};

// Initialize with seed data
function ensureInitialized(): void {
  if (requisitesHistory.length === 0) {
    requisitesHistory.push({
      ...INITIAL_REQUISITES,
      id: "req_initial_001",
      updatedAt: new Date().toISOString(),
      version: 1,
    });
  }
}

/**
 * Get the latest active requisites
 */
export function getLatestRequisites(): Requisites | null {
  ensureInitialized();
  // Find the most recent active requisites
  const active = requisitesHistory
    .filter((r) => r.isActive)
    .sort((a, b) => b.version - a.version);
  return active[0] ?? null;
}

/**
 * Get requisites by ID
 */
export function getRequisitesById(id: string): Requisites | null {
  ensureInitialized();
  return requisitesHistory.find((r) => r.id === id) ?? null;
}

/**
 * Get requisites by version number
 */
export function getRequisitesByVersion(version: number): Requisites | null {
  ensureInitialized();
  return requisitesHistory.find((r) => r.version === version) ?? null;
}

/**
 * Get all requisites history (sorted by version desc)
 */
export function getRequisitesHistory(): Requisites[] {
  ensureInitialized();
  return [...requisitesHistory].sort((a, b) => b.version - a.version);
}

/**
 * Add new requisites version (append-only)
 */
export function addRequisitesVersion(
  data: Omit<Requisites, "id" | "updatedAt" | "version">,
  actorId: string
): Requisites {
  ensureInitialized();

  // Get current max version
  const maxVersion = Math.max(0, ...requisitesHistory.map((r) => r.version));
  const newVersion = maxVersion + 1;

  // Deactivate all previous versions
  requisitesHistory.forEach((r) => {
    r.isActive = false;
  });

  const newRequisites: Requisites = {
    ...data,
    id: `req_${Date.now()}_${actorId.slice(0, 8)}`,
    updatedAt: new Date().toISOString(),
    version: newVersion,
    isActive: true,
  };

  requisitesHistory.push(newRequisites);
  return newRequisites;
}

/**
 * Update existing requisites (creates new version)
 */
export function updateRequisites(
  id: string,
  updates: Partial<Omit<Requisites, "id" | "updatedAt" | "version">>,
  actorId: string
): Requisites {
  ensureInitialized();

  const existing = getRequisitesById(id);
  if (!existing) {
    throw new Error(`Requisites not found: ${id}`);
  }

  // Create new version with updates
  return addRequisitesVersion(
    {
      title: updates.title ?? existing.title,
      bankName: updates.bankName ?? existing.bankName,
      bik: updates.bik ?? existing.bik,
      account: updates.account ?? existing.account,
      corrAccount: updates.corrAccount ?? existing.corrAccount,
      inn: updates.inn ?? existing.inn,
      kpp: updates.kpp ?? existing.kpp,
      recipientName: updates.recipientName ?? existing.recipientName,
      purposeTemplate: updates.purposeTemplate ?? existing.purposeTemplate,
      isActive: updates.isActive ?? true,
    },
    actorId
  );
}

/**
 * Reset store (for testing)
 */
export function _resetRequisitesStore(): void {
  requisitesHistory.length = 0;
}

/**
 * Seed store with test data (for testing)
 */
export function _seedRequisitesStore(items: Requisites[]): void {
  requisitesHistory.length = 0;
  requisitesHistory.push(...items);
}
