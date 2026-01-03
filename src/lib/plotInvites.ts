import fs from "fs/promises";
import path from "path";
import { isServerlessReadonlyFs, warnReadonlyFs } from "@/lib/fsGuard";
import crypto from "crypto";
import { setUserPlot } from "@/lib/plots";

export type PlotInvite = {
  plotId: string;
  phone: string;
  tokenHash: string;
  expiresAt: string;
  createdByUserId: string;
  createdAt: string;
  usedAt: string | null;
  usedByUserId: string | null;
};

const invitesPath = path.join(process.cwd(), "data", "plot-invites.json");

async function writeJson<T>(file: string, data: T) {
  if (isServerlessReadonlyFs()) {
    warnReadonlyFs("plot-invites:write");
    return;
  }
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tmp, file);
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    if (isServerlessReadonlyFs()) {
      warnReadonlyFs("plot-invites:read-fallback");
      return fallback;
    }
    const dir = path.dirname(file);
    await fs.mkdir(dir, { recursive: true });
    await writeJson(file, fallback);
    return fallback;
  }
}

function normalizePhone(phone: string) {
  return phone.replace(/\D+/g, "");
}

export async function createPlotInvite(params: { plotId: string; phone: string; createdByUserId: string; expiresInDays?: number }) {
  const token = Math.random().toString(36).slice(2, 10).toUpperCase();
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (params.expiresInDays ?? 7) * 24 * 60 * 60 * 1000).toISOString();
  const invite: PlotInvite = {
    plotId: params.plotId,
    phone: normalizePhone(params.phone),
    tokenHash,
    expiresAt,
    createdByUserId: params.createdByUserId,
    createdAt: now.toISOString(),
    usedAt: null,
    usedByUserId: null,
  };
  const invites = await readJson<PlotInvite[]>(invitesPath, []);
  invites.push(invite);
  await writeJson(invitesPath, invites);
  return token;
}

export async function acceptPlotInvite(params: { token: string; userId: string }) {
  const invites = await readJson<PlotInvite[]>(invitesPath, []);
  const hash = crypto.createHash("sha256").update(params.token.toUpperCase()).digest("hex");
  const now = new Date();
  const invite = invites.find((i) => i.tokenHash === hash && !i.usedAt && new Date(i.expiresAt) >= now);
  if (!invite) return { ok: false as const, reason: "invalid" as const };
  invite.usedAt = now.toISOString();
  invite.usedByUserId = params.userId;
  await writeJson(invitesPath, invites);
  await setUserPlot({
    userId: params.userId,
    plotId: invite.plotId,
    status: "active",
    ownershipStatus: "pending",
    ownershipProof: {
      type: "other",
      note: "Доступ по приглашению",
      verifiedAt: null,
      verifiedBy: null,
    },
    role: "DELEGATE",
  });
  return { ok: true as const, plotId: invite.plotId };
}

export async function listPlotInvites(plotId: string) {
  const invites = await readJson<PlotInvite[]>(invitesPath, []);
  return invites.filter((i) => i.plotId === plotId);
}
