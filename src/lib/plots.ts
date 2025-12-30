import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { getOwnershipStore } from "@/lib/ownershipStore";

export type PlotRecord = {
  plotId: string;
  street: string;
  plotNumber: string;
  displayName?: string | null;
  cadastral: string | null;
  notes: string | null;
  inviteCode?: string | null;
  inviteCodeHash?: string | null;
  inviteCodeIssuedAt?: string | null;
  codeUsedAt?: string | null;
  ownerUserId?: string | null;
  status?: "DRAFT" | "CLAIMED" | "VERIFIED";
  claimedAt?: string | null;
  verifiedAt?: string | null;
  verifiedByUserId?: string | null;
  proposedChanges?: {
    street?: string | null;
    plotNumber?: string | null;
    cadastral?: string | null;
  } | null;
  seedOwnerName?: string | null;
  seedPhone?: string | null;
  delegateUserId?: string | null;
  delegateInvitedAt?: string | null;
  delegateAddedAt?: string | null;
  delegateInviteTokenHash?: string | null;
  delegateInviteExpiresAt?: string | null;
  delegateInviteUsedAt?: string | null;
  lastActionAt?: string | null;
  lastActionBy?: string | null;
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
  role?: "OWNER" | "DELEGATE";
};

export type DocumentMeta = {
  name: string;
  size: number;
  type: string;
  lastModified: number | null;
};

export type OwnershipVerification = {
  id: string;
  userId: string;
  cadastralNumber: string;
  documentMeta: DocumentMeta;
  status: "sent" | "approved" | "rejected";
  createdAt: string;
  reviewedAt?: string | null;
  reviewNote?: string | null;
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

function normalizePlot(p: PlotRecord): PlotRecord {
  return {
    ...p,
    displayName: p.displayName ?? `№ ${p.plotNumber}`,
    status: p.status ?? "DRAFT",
    inviteCodeHash: p.inviteCodeHash ?? null,
    inviteCodeIssuedAt: p.inviteCodeIssuedAt ?? null,
    seedOwnerName: p.seedOwnerName ?? null,
    seedPhone: p.seedPhone ?? null,
    claimedAt: p.claimedAt ?? null,
    verifiedAt: p.verifiedAt ?? null,
    verifiedByUserId: p.verifiedByUserId ?? null,
    proposedChanges: p.proposedChanges ?? null,
    delegateUserId: p.delegateUserId ?? null,
    delegateInvitedAt: p.delegateInvitedAt ?? null,
    delegateAddedAt: p.delegateAddedAt ?? null,
    delegateInviteTokenHash: p.delegateInviteTokenHash ?? null,
    delegateInviteExpiresAt: p.delegateInviteExpiresAt ?? null,
    delegateInviteUsedAt: p.delegateInviteUsedAt ?? null,
    lastActionAt: p.lastActionAt ?? null,
    lastActionBy: p.lastActionBy ?? null,
  };
}

const ownershipStore = getOwnershipStore();

function sanitizeDocumentName(name: string) {
  const cleaned = name.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return cleaned.length > 120 ? cleaned.slice(0, 120) : cleaned;
}

function sanitizeDocumentMeta(meta: DocumentMeta): DocumentMeta {
  return {
    ...meta,
    name: sanitizeDocumentName(meta.name),
  };
}

export async function getPlots(): Promise<PlotRecord[]> {
  const items = await readJson<PlotRecord[]>(plotsPath, []);
  return items.map(normalizePlot);
}

export async function upsertPlot(input: {
  street: string;
  plotNumber: string;
  cadastral?: string | null;
  notes?: string | null;
  inviteCode?: string | null;
  inviteCodeHash?: string | null;
  inviteCodeIssuedAt?: string | null;
  ownerUserId?: string | null;
  status?: "DRAFT" | "CLAIMED" | "VERIFIED";
  proposedChanges?: PlotRecord["proposedChanges"];
  displayName?: string | null;
  seedOwnerName?: string | null;
  seedPhone?: string | null;
  claimedAt?: string | null;
  verifiedAt?: string | null;
  verifiedByUserId?: string | null;
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
    displayName: input.displayName ?? existing?.displayName ?? `№ ${input.plotNumber}`,
    cadastral: input.cadastral !== undefined ? input.cadastral ?? null : existing?.cadastral ?? null,
    notes: input.notes ?? null,
    inviteCode: input.inviteCode !== undefined ? input.inviteCode : existing?.inviteCode ?? null,
    inviteCodeHash: input.inviteCodeHash !== undefined ? input.inviteCodeHash : existing?.inviteCodeHash ?? null,
    inviteCodeIssuedAt: input.inviteCodeIssuedAt !== undefined ? input.inviteCodeIssuedAt : existing?.inviteCodeIssuedAt ?? null,
    codeUsedAt: existing?.codeUsedAt ?? null,
    ownerUserId: input.ownerUserId !== undefined ? input.ownerUserId : existing?.ownerUserId ?? null,
    status: input.status ?? existing?.status ?? "DRAFT",
    proposedChanges: input.proposedChanges ?? existing?.proposedChanges ?? null,
    seedOwnerName: input.seedOwnerName ?? existing?.seedOwnerName ?? null,
    seedPhone: input.seedPhone ?? existing?.seedPhone ?? null,
    claimedAt: input.claimedAt ?? existing?.claimedAt ?? null,
    verifiedAt: input.verifiedAt ?? existing?.verifiedAt ?? null,
    verifiedByUserId: input.verifiedByUserId ?? existing?.verifiedByUserId ?? null,
    delegateUserId: existing?.delegateUserId ?? null,
    delegateInvitedAt: existing?.delegateInvitedAt ?? null,
    delegateAddedAt: existing?.delegateAddedAt ?? null,
    delegateInviteTokenHash: existing?.delegateInviteTokenHash ?? null,
    delegateInviteExpiresAt: existing?.delegateInviteExpiresAt ?? null,
    delegateInviteUsedAt: existing?.delegateInviteUsedAt ?? null,
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
    role: link.role ?? "OWNER",
  };
}

export type UserPlotView = PlotRecord & {
  linkStatus: "active" | "pending";
  ownershipStatus: UserPlotRecord["ownershipStatus"];
  ownershipProof: UserPlotRecord["ownershipProof"];
  role: "OWNER" | "DELEGATE";
};

export async function getUserPlots(userId: string): Promise<UserPlotView[]> {
  if (!userId) return [] as UserPlotView[];
  const userPlots = (await readJson<UserPlotRecord[]>(userPlotsPath, [])).map(withDefaults);
  const links = userPlots.filter((p) => p.userId === userId);
  if (links.length === 0) return [] as UserPlotView[];
  const plots = await getPlots();
  return links
    .map((l) => {
      const plot = plots.find((p) => p.plotId === l.plotId);
      if (!plot) return null;
      return {
        ...plot,
        linkStatus: l.status,
        ownershipStatus: l.ownershipStatus,
        ownershipProof: l.ownershipProof,
        role: l.role ?? "OWNER",
      };
    })
    .filter(Boolean) as UserPlotView[];
}

export async function getUserPlot(userId: string) {
  const plots = await getUserPlots(userId);
  return plots.find((p) => p.linkStatus === "active") || plots[0] || null;
}

export async function getOwnershipVerifications(): Promise<OwnershipVerification[]> {
  return ownershipStore.listAll();
}

export async function getUserOwnershipVerifications(userId: string): Promise<OwnershipVerification[]> {
  return ownershipStore.listByUser(userId);
}

export async function createOwnershipVerification(input: {
  userId: string;
  cadastralNumber: string;
  documentMeta: DocumentMeta;
}) {
  if (!input.userId || !input.cadastralNumber) return null;
  const existing = await ownershipStore.listByUser(input.userId);
  const normalized = input.cadastralNumber.trim().toLowerCase();
  const approved = existing.find(
    (item) => item.cadastralNumber.trim().toLowerCase() === normalized && item.status === "approved",
  );
  if (approved) return approved;
  const sent = existing.find(
    (item) => item.cadastralNumber.trim().toLowerCase() === normalized && item.status === "sent",
  );
  if (sent) return sent;
  return ownershipStore.create({
    userId: input.userId,
    cadastralNumber: input.cadastralNumber,
    documentMeta: sanitizeDocumentMeta(input.documentMeta),
  });
}

async function findPlotByCadastral(cadastralNumber: string) {
  const plots = await getPlots();
  const normalized = cadastralNumber.trim().toLowerCase();
  return plots.find((plot) => (plot.cadastral || "").trim().toLowerCase() === normalized) ?? null;
}

export async function reviewOwnershipVerification(input: {
  id: string;
  status: "approved" | "rejected";
  reviewNote?: string | null;
  reviewerId?: string | null;
}) {
  const updated = await ownershipStore.update({
    id: input.id,
    status: input.status,
    reviewNote: input.reviewNote,
    reviewerId: input.reviewerId,
  });
  if (!updated) return null;

  if (input.status === "approved") {
    const now = new Date().toISOString();
    const cadastralNumber = updated.cadastralNumber;
    let plot = await findPlotByCadastral(cadastralNumber);
    if (!plot) {
      plot = await upsertPlot({
        street: "—",
        plotNumber: cadastralNumber,
        cadastral: cadastralNumber,
        displayName: cadastralNumber,
      });
    }
    if (plot) {
      await setUserPlot({
        userId: updated.userId,
        plotId: plot.plotId,
        status: "active",
        ownershipStatus: "verified",
        ownershipProof: {
          type: "other",
          note: `Документ: ${updated.documentMeta.name}`,
          verifiedAt: now,
          verifiedBy: "admin",
        },
        role: "OWNER",
      });
    }
  }

  return updated;
}

export async function setUserPlot(input: {
  userId: string;
  plotId: string;
  status: "active" | "pending";
  ownershipStatus?: UserPlotRecord["ownershipStatus"];
  ownershipProof?: UserPlotRecord["ownershipProof"];
  role?: "OWNER" | "DELEGATE";
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
    role: input.role ?? "OWNER",
  }) : withDefaults(links[idx]);
  const record: UserPlotRecord = {
    ...base,
    status: input.status,
    updatedAt: now,
    updatedBy: "admin",
    ownershipStatus: input.ownershipStatus ?? base.ownershipStatus ?? "pending",
    ownershipProof: input.ownershipProof ?? base.ownershipProof,
    role: input.role ?? base.role ?? "OWNER",
  };
  if (idx === -1) {
    links.push(record);
  } else {
    links[idx] = record;
  }
  await writeJson(userPlotsPath, links);
}

async function removeUserPlotLinks(plotId: string, role?: "OWNER" | "DELEGATE") {
  const links = (await readJson<UserPlotRecord[]>(userPlotsPath, [])).map(withDefaults);
  const filtered = links.filter((l) => !(l.plotId === plotId && (role ? l.role === role : true)));
  if (filtered.length !== links.length) {
    await writeJson(userPlotsPath, filtered);
  }
}

export async function generateInviteCode(plotId: string, actorUserId?: string | null) {
  if (!plotId) return null;
  const plots = await getPlots();
  const idx = plots.findIndex((p) => p.plotId === plotId);
  if (idx === -1) return null;
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  const hash = crypto.createHash("sha256").update(code).digest("hex");
  const now = new Date().toISOString();
  plots[idx].inviteCode = null; // не храним оригинал
  plots[idx].inviteCodeHash = hash;
  plots[idx].inviteCodeIssuedAt = now;
  plots[idx].codeUsedAt = null;
  plots[idx].lastActionAt = now;
  plots[idx].lastActionBy = actorUserId ? `admin:${actorUserId}` : null;
  await writeJson(plotsPath, plots);
  return code;
}

export async function claimPlotByCode(code: string, userId: string) {
  if (!code || !userId) return { ok: false as const, reason: "invalid" as const };
  const plots = await getPlots();
  const hash = crypto.createHash("sha256").update(code.toUpperCase()).digest("hex");
  const idx = plots.findIndex((p) => (p.inviteCodeHash || "").toUpperCase() === hash.toUpperCase());
  if (idx === -1) return { ok: false as const, reason: "not_found" as const };
  if (plots[idx].ownerUserId) return { ok: false as const, reason: "taken" as const };
  const now = new Date().toISOString();
  plots[idx].ownerUserId = userId;
  plots[idx].codeUsedAt = now;
  plots[idx].status = plots[idx].status ?? "CLAIMED";
  plots[idx].status = "CLAIMED";
  plots[idx].claimedAt = now;
  plots[idx].inviteCodeHash = null;
  plots[idx].proposedChanges = null;
  plots[idx].lastActionAt = now;
  plots[idx].lastActionBy = `user:${userId}`;
  await writeJson(plotsPath, plots);
  await setUserPlot({
    userId,
    plotId: plots[idx].plotId,
    status: "active",
    ownershipStatus: "verified",
    ownershipProof: {
      type: "other",
      note: "Привязка по коду участка",
      verifiedAt: now,
      verifiedBy: "admin",
    },
  });
  return { ok: true as const, plot: plots[idx] };
}

export async function resetPlotOwner(plotId: string, actorUserId?: string | null) {
  if (!plotId) return;
  const plots = await getPlots();
  const idx = plots.findIndex((p) => p.plotId === plotId);
  if (idx === -1) return;
  const now = new Date().toISOString();
  plots[idx].ownerUserId = null;
  plots[idx].codeUsedAt = null;
  plots[idx].inviteCodeHash = null;
  plots[idx].inviteCodeIssuedAt = null;
  plots[idx].status = "DRAFT";
  plots[idx].proposedChanges = null;
  plots[idx].delegateUserId = null;
  plots[idx].delegateInvitedAt = null;
  plots[idx].delegateAddedAt = null;
  plots[idx].delegateInviteTokenHash = null;
  plots[idx].delegateInviteExpiresAt = null;
  plots[idx].delegateInviteUsedAt = null;
  plots[idx].lastActionAt = now;
  plots[idx].lastActionBy = actorUserId ? `admin:${actorUserId}` : null;
  await writeJson(plotsPath, plots);
  await removeUserPlotLinks(plotId);
}

export async function clearInviteCode(plotId: string, actorUserId?: string | null) {
  if (!plotId) return;
  const plots = await getPlots();
  const idx = plots.findIndex((p) => p.plotId === plotId);
  if (idx === -1) return;
  const now = new Date().toISOString();
  plots[idx].inviteCodeHash = null;
  plots[idx].inviteCodeIssuedAt = null;
  plots[idx].codeUsedAt = null;
  plots[idx].lastActionAt = now;
  plots[idx].lastActionBy = actorUserId ? `admin:${actorUserId}` : null;
  await writeJson(plotsPath, plots);
}

export async function clearDelegate(plotId: string) {
  if (!plotId) return;
  const plots = await getPlots();
  const idx = plots.findIndex((p) => p.plotId === plotId);
  if (idx === -1) return;
  plots[idx].delegateUserId = null;
  plots[idx].delegateInvitedAt = null;
  plots[idx].delegateAddedAt = null;
  plots[idx].delegateInviteTokenHash = null;
  plots[idx].delegateInviteExpiresAt = null;
  plots[idx].delegateInviteUsedAt = null;
  await writeJson(plotsPath, plots);
  await removeUserPlotLinks(plotId, "DELEGATE");
}

export async function verifyPlot(plotId: string) {
  if (!plotId) return;
  const plots = await getPlots();
  const idx = plots.findIndex((p) => p.plotId === plotId);
  if (idx === -1) return;
  plots[idx].status = "VERIFIED";
  await writeJson(plotsPath, plots);
}

export async function submitPlotProposal(params: {
  userId: string;
  plotId: string;
  street?: string | null;
  plotNumber?: string | null;
  cadastral?: string | null;
}) {
  if (!params.userId || !params.plotId) return { ok: false as const, reason: "invalid" as const };
  const plots = await getPlots();
  const idx = plots.findIndex((p) => p.plotId === params.plotId);
  if (idx === -1) return { ok: false as const, reason: "not_found" as const };
  if (plots[idx].ownerUserId !== params.userId) return { ok: false as const, reason: "forbidden" as const };
  plots[idx].proposedChanges = {
    street: params.street ?? plots[idx].street,
    plotNumber: params.plotNumber ?? plots[idx].plotNumber,
    cadastral: params.cadastral ?? plots[idx].cadastral,
  };
  plots[idx].status = plots[idx].status === "VERIFIED" ? "VERIFIED" : "CLAIMED";
  await writeJson(plotsPath, plots);
  return { ok: true as const };
}

export async function approvePlotProposal(plotId: string) {
  if (!plotId) return;
  const plots = await getPlots();
  const idx = plots.findIndex((p) => p.plotId === plotId);
  if (idx === -1) return;
  const changes = plots[idx].proposedChanges;
  plots[idx] = {
    ...plots[idx],
    street: changes?.street ?? plots[idx].street,
    plotNumber: changes?.plotNumber ?? plots[idx].plotNumber,
    cadastral: changes?.cadastral ?? plots[idx].cadastral ?? null,
    proposedChanges: null,
    status: "VERIFIED",
    verifiedAt: new Date().toISOString(),
  };
  await writeJson(plotsPath, plots);
}

export async function rejectPlotProposal(plotId: string, comment?: string | null) {
  if (!plotId) return;
  const plots = await getPlots();
  const idx = plots.findIndex((p) => p.plotId === plotId);
  if (idx === -1) return;
  plots[idx].proposedChanges = null;
  plots[idx].notes = comment ?? plots[idx].notes ?? null;
  plots[idx].status = plots[idx].status === "VERIFIED" ? "VERIFIED" : "CLAIMED";
  await writeJson(plotsPath, plots);
}

function hashToken(code: string) {
  return crypto.createHash("sha256").update(code.toUpperCase()).digest("hex");
}

function generateReadableToken() {
  const raw = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
}

export async function generateDelegateInvite(params: {
  plotId: string;
  createdByUserId: string;
  isAdmin?: boolean;
  allowReplace?: boolean;
  expiresInDays?: number;
}) {
  const plots = await getPlots();
  const idx = plots.findIndex((p) => p.plotId === params.plotId);
  if (idx === -1) return { ok: false as const, reason: "not_found" as const };
  const plot = plots[idx];
  if (!plot.ownerUserId) return { ok: false as const, reason: "no_owner" as const };
  const isOwner = plot.ownerUserId === params.createdByUserId;
  if (!isOwner && !params.isAdmin) return { ok: false as const, reason: "forbidden" as const };
  if (plot.delegateUserId && !params.allowReplace) {
    return { ok: false as const, reason: "delegate_exists" as const };
  }
  if (params.allowReplace) {
    await removeUserPlotLinks(plot.plotId, "DELEGATE");
  }
  const token = generateReadableToken();
  const hash = hashToken(token);
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + (params.expiresInDays && params.expiresInDays > 0 ? params.expiresInDays : 7) * 24 * 60 * 60 * 1000,
  ).toISOString();
  plots[idx] = {
    ...plots[idx],
    delegateUserId: null,
    delegateAddedAt: null,
    delegateInviteUsedAt: null,
    delegateInviteTokenHash: hash,
    delegateInviteExpiresAt: expiresAt,
    delegateInvitedAt: now.toISOString(),
  };
  await writeJson(plotsPath, plots);
  return { ok: true as const, token };
}

export async function acceptDelegateInvite(params: { token: string; userId: string }) {
  const plots = await getPlots();
  const hash = hashToken(params.token);
  const now = new Date();
  const idx = plots.findIndex(
    (p) =>
      (p.delegateInviteTokenHash || "").toUpperCase() === hash.toUpperCase() &&
      (!p.delegateInviteExpiresAt || new Date(p.delegateInviteExpiresAt) >= now),
  );
  if (idx === -1) return { ok: false as const, reason: "invalid" as const };
  const plot = plots[idx];
  if (!plot.ownerUserId) return { ok: false as const, reason: "no_owner" as const };
  if (plot.delegateUserId) return { ok: false as const, reason: "delegate_exists" as const };
  const nowIso = now.toISOString();
  plots[idx] = {
    ...plot,
    delegateUserId: params.userId,
    delegateAddedAt: nowIso,
    delegateInviteUsedAt: nowIso,
    delegateInviteTokenHash: null,
    delegateInviteExpiresAt: null,
  };
  await writeJson(plotsPath, plots);
  await setUserPlot({
    userId: params.userId,
    plotId: plot.plotId,
    status: "active",
    ownershipStatus: "pending",
    ownershipProof: {
      type: "other",
      note: "Доступ по приглашению представителя",
      verifiedAt: null,
      verifiedBy: null,
    },
    role: "DELEGATE",
  });
  return { ok: true as const, plotId: plot.plotId };
}
