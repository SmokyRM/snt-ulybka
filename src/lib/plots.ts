import fs from "fs/promises";
import path from "path";

export type PlotRecord = {
  plotId: string;
  street: string;
  plotNumber: string;
  cadastral: string | null;
  notes: string | null;
};

export type UserPlotRecord = {
  userId: string;
  plotId: string;
  status: "active" | "pending";
  updatedAt: string;
  updatedBy: "admin" | "system";
  ownershipStatus: "pending" | "verified" | "rejected";
  ownershipProof: {
    type: "extract_egrn" | "sale_contract" | "garden_book" | "other";
    note: string | null;
    verifiedAt: string | null;
    verifiedBy: "admin" | null;
  };
};

const plotsPath = path.join(process.cwd(), "data", "plots.json");
const userPlotsPath = path.join(process.cwd(), "data", "user-plots.json");

const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

async function writeJson<T>(file: string, data: T) {
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tmp, file);
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    const dir = path.dirname(file);
    await fs.mkdir(dir, { recursive: true });
    await writeJson(file, fallback);
    return fallback;
  }
}

export async function getPlots(): Promise<PlotRecord[]> {
  return readJson<PlotRecord[]>(plotsPath, []);
}

export async function upsertPlot(input: {
  street: string;
  plotNumber: string;
  cadastral?: string | null;
  notes?: string | null;
}) {
  if (!input.street || !input.plotNumber) return null;
  const plots = await getPlots();
  const existingIdx = plots.findIndex(
    (p) => p.street.toLowerCase() === input.street.toLowerCase() && p.plotNumber === input.plotNumber,
  );
  const existing = existingIdx === -1 ? null : plots[existingIdx];
  const record: PlotRecord = {
    plotId: existingIdx === -1 ? makeId() : plots[existingIdx].plotId,
    street: input.street,
    plotNumber: input.plotNumber,
    cadastral: input.cadastral !== undefined ? input.cadastral ?? null : existing?.cadastral ?? null,
    notes: input.notes ?? null,
  };
  if (existingIdx === -1) {
    plots.push(record);
  } else {
    plots[existingIdx] = record;
  }
  await writeJson(plotsPath, plots);
  return record;
}

function withDefaults(link: UserPlotRecord): UserPlotRecord {
  return {
    ...link,
    ownershipStatus: link.ownershipStatus ?? "pending",
    ownershipProof: link.ownershipProof ?? {
      type: "other",
      note: null,
      verifiedAt: null,
      verifiedBy: null,
    },
  };
}

export async function getUserPlots(userId: string) {
  if (!userId) return [];
  const userPlots = (await readJson<UserPlotRecord[]>(userPlotsPath, [])).map(withDefaults);
  const links = userPlots.filter((p) => p.userId === userId);
  if (links.length === 0) return [];
  const plots = await getPlots();
  return links
    .map((l) => {
      const plot = plots.find((p) => p.plotId === l.plotId);
      if (!plot) return null;
      return { ...plot, status: l.status, ownershipStatus: l.ownershipStatus, ownershipProof: l.ownershipProof };
    })
    .filter(Boolean) as Array<
      PlotRecord & { status: "active" | "pending"; ownershipStatus: UserPlotRecord["ownershipStatus"]; ownershipProof: UserPlotRecord["ownershipProof"] }
    >;
}

export async function getUserPlot(userId: string) {
  const plots = await getUserPlots(userId);
  return plots.find((p) => p.status === "active") || plots[0] || null;
}

export async function setUserPlot(input: {
  userId: string;
  plotId: string;
  status: "active" | "pending";
  ownershipStatus?: UserPlotRecord["ownershipStatus"];
  ownershipProof?: UserPlotRecord["ownershipProof"];
}) {
  if (!input.userId || !input.plotId) return;
  const links = (await readJson<UserPlotRecord[]>(userPlotsPath, [])).map(withDefaults);
  const idx = links.findIndex((l) => l.userId === input.userId && l.plotId === input.plotId);
  const now = new Date().toISOString();
  const base: UserPlotRecord = idx === -1 ? withDefaults({
    userId: input.userId,
    plotId: input.plotId,
    status: input.status,
    updatedAt: now,
    updatedBy: "admin",
    ownershipStatus: input.ownershipStatus ?? "pending",
    ownershipProof: input.ownershipProof ?? {
      type: "other",
      note: null,
      verifiedAt: null,
      verifiedBy: null,
    },
  }) : withDefaults(links[idx]);
  const record: UserPlotRecord = {
    ...base,
    status: input.status,
    updatedAt: now,
    updatedBy: "admin",
    ownershipStatus: input.ownershipStatus ?? base.ownershipStatus ?? "pending",
    ownershipProof: input.ownershipProof ?? base.ownershipProof,
  };
  if (idx === -1) {
    links.push(record);
  } else {
    links[idx] = record;
  }
  await writeJson(userPlotsPath, links);
}
