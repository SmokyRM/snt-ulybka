import type { RegistryPerson } from "@/types/snt";

// In-memory store for registry persons
declare global {
  // eslint-disable-next-line no-var
  var __SNT_REGISTRY_PERSONS_DB__: RegistryPerson[] | undefined;
}

function getDb(): RegistryPerson[] {
  if (!globalThis.__SNT_REGISTRY_PERSONS_DB__) {
    globalThis.__SNT_REGISTRY_PERSONS_DB__ = [];
  }
  return globalThis.__SNT_REGISTRY_PERSONS_DB__;
}

export function createPerson(data: {
  fullName: string;
  phone?: string | null;
  email?: string | null;
  plots?: string[];
  verificationStatus?: "not_verified" | "pending" | "verified" | "rejected";
}): RegistryPerson {
  const now = new Date().toISOString();
  const person: RegistryPerson = {
    id: `person-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    fullName: data.fullName.trim(),
    phone: data.phone?.trim() || null,
    email: data.email?.trim()?.toLowerCase() || null,
    plots: data.plots || [],
    verificationStatus: data.verificationStatus || "not_verified",
    userId: null,
    createdAt: now,
    updatedAt: now,
  };
  getDb().push(person);
  return person;
}

export function getPerson(id: string): RegistryPerson | null {
  return getDb().find((p) => p.id === id) || null;
}

export function listPersons(params?: {
  q?: string;
  verificationStatus?: "not_verified" | "pending" | "verified" | "rejected";
}): RegistryPerson[] {
  let result = [...getDb()];

  if (params?.q) {
    const query = params.q.toLowerCase().trim();
    result = result.filter(
      (p) =>
        p.fullName.toLowerCase().includes(query) ||
        p.phone?.includes(query) ||
        p.email?.toLowerCase().includes(query)
    );
  }

  if (params?.verificationStatus) {
    result = result.filter((p) => p.verificationStatus === params.verificationStatus);
  }

  return result;
}

export function updatePerson(
  id: string,
  updates: Partial<{
    fullName: string;
    phone: string | null;
    email: string | null;
    plots: string[];
    verificationStatus: "not_verified" | "pending" | "verified" | "rejected";
    userId: string | null;
  }>
): RegistryPerson | null {
  const person = getPerson(id);
  if (!person) return null;

  Object.assign(person, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
  return person;
}

export function deletePerson(id: string): boolean {
  const db = getDb();
  const idx = db.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  db.splice(idx, 1);
  return true;
}
