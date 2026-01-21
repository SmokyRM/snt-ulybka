import type { RegistryPlot } from "@/types/snt";

// In-memory store for registry plots
declare global {
  // eslint-disable-next-line no-var
  var __SNT_REGISTRY_PLOTS_DB__: RegistryPlot[] | undefined;
}

function getDb(): RegistryPlot[] {
  if (!globalThis.__SNT_REGISTRY_PLOTS_DB__) {
    globalThis.__SNT_REGISTRY_PLOTS_DB__ = [];
  }
  return globalThis.__SNT_REGISTRY_PLOTS_DB__;
}

export function createPlot(data: {
  plotNumber: string;
  sntStreetNumber: string;
  cityAddress?: string | null;
  personId: string;
}): RegistryPlot {
  const now = new Date().toISOString();
  const plot: RegistryPlot = {
    id: `plot-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    plotNumber: data.plotNumber.trim(),
    sntStreetNumber: data.sntStreetNumber.trim(),
    cityAddress: data.cityAddress?.trim() || null,
    personId: data.personId,
    createdAt: now,
    updatedAt: now,
  };
  getDb().push(plot);
  return plot;
}

export function getPlot(id: string): RegistryPlot | null {
  return getDb().find((p) => p.id === id) || null;
}

export function listPlots(params?: {
  personId?: string;
  q?: string;
}): RegistryPlot[] {
  let result = [...getDb()];

  if (params?.personId) {
    result = result.filter((p) => p.personId === params.personId);
  }

  if (params?.q) {
    const query = params.q.toLowerCase().trim();
    result = result.filter(
      (p) =>
        p.plotNumber.toLowerCase().includes(query) ||
        p.sntStreetNumber.toLowerCase().includes(query) ||
        p.cityAddress?.toLowerCase().includes(query)
    );
  }

  return result;
}

export function updatePlot(
  id: string,
  updates: Partial<{
    plotNumber: string;
    sntStreetNumber: string;
    cityAddress: string | null;
    personId: string;
  }>
): RegistryPlot | null {
  const plot = getPlot(id);
  if (!plot) return null;

  Object.assign(plot, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
  return plot;
}

export function deletePlot(id: string): boolean {
  const db = getDb();
  const idx = db.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  db.splice(idx, 1);
  return true;
}

export function deletePlotsByPersonId(personId: string): number {
  const db = getDb();
  const initialLength = db.length;
  const filtered = db.filter((p) => p.personId !== personId);
  db.length = 0;
  db.push(...filtered);
  return initialLength - db.length;
}
