// server-only mock master list of plots
import "server-only";

export type PlotMasterItem = {
  id: string;
  streetNo: number;
  plotLabel: string;
  plotKey: string;
  description?: string;
};

const streetsCount = 27;

export const normalizePlotLabel = (raw: string): string =>
  raw
    .trim()
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/а/g, "a")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s*,\s*/g, ",")
    .replace(/\s+/g, " ");

export const makePlotKey = (streetNo: number, plotLabel: string): string =>
  `${streetNo}:${normalizePlotLabel(plotLabel)}`;

// generate simple mock list: 3 участков на каждую улицу
const plots: PlotMasterItem[] = Array.from({ length: streetsCount })
  .flatMap((_, idx) => {
    const streetNo = idx + 1;
    return ["1", "2", "3"].map((plotLabel) => ({
      id: `s${streetNo}-${plotLabel}`,
      streetNo,
      plotLabel,
      plotKey: makePlotKey(streetNo, plotLabel),
      description: `Улица ${streetNo}, участок ${plotLabel}`,
    }));
  });

export function listPlots(params: { street?: number; q?: string } = {}): PlotMasterItem[] {
  const streetNo = params.street;
  const q = params.q?.trim().toLowerCase();
  let items = plots;
  if (streetNo) {
    items = items.filter((p) => p.streetNo === streetNo);
  }
  if (q) {
    items = items.filter((p) => `${p.streetNo} ${p.plotLabel} ${p.description ?? ""}`.toLowerCase().includes(q));
  }
  return items;
}

export function getByKey(streetNo: number, plotLabel: string): PlotMasterItem | null {
  const key = makePlotKey(streetNo, plotLabel);
  return plots.find((p) => p.plotKey === key) ?? null;
}

export function getById(id: string): PlotMasterItem | null {
  return plots.find((p) => p.id === id) ?? null;
}
