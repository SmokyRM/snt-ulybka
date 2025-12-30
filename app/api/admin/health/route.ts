import { NextResponse } from "next/server";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { getSetting } from "@/lib/mockDb";
import { formatAdminTime } from "@/lib/settings.shared";

const formatLocal = (date: Date) => formatAdminTime(date.toISOString());

const pingDb = async () => {
  const started = Date.now();
  try {
    // Lightweight read from in-memory mock DB
    const requisites = getSetting("payment_details");
    const latencyMs = Date.now() - started;
    return { ok: true, latencyMs, sample: requisites?.key };
  } catch (error) {
    const latencyMs = Date.now() - started;
    return { ok: false, latencyMs, error: (error as Error).message };
  }
};

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!hasAdminAccess(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const now = new Date();
  const db = await pingDb();
  const sessionOk = Boolean(user);

  const requisites = getSetting("payment_details");
  const social = getSetting("official_channels");

  const buildInfo = {
    commitHash: process.env.VERCEL_GIT_COMMIT_SHA || null,
    branch: process.env.VERCEL_GIT_COMMIT_REF || null,
    buildTime: process.env.VERCEL_DEPLOYMENT_ID || null,
  };

  return NextResponse.json({
    ok: db.ok && sessionOk,
    serverTimeIso: now.toISOString(),
    serverTimeLocalFormatted: formatLocal(now),
    uptimeSeconds: Math.round(process.uptime()),
    buildInfo,
    db,
    session: { ok: sessionOk },
    lastUpdates: {
      requisitesUpdatedAt: requisites?.updatedAt ?? null,
      socialLinksUpdatedAt: social?.updatedAt ?? null,
    },
    recentErrors: [],
  });
}
