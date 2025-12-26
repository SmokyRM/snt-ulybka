import fs from "fs/promises";
import path from "path";

export type FeatureFlagKey = "newPublicHome" | "debtsV2" | "cabinetMvp";

type FlagsRecord = Record<FeatureFlagKey, boolean>;

const defaultFlags: FlagsRecord = {
  newPublicHome: false,
  debtsV2: false,
  cabinetMvp: false,
};

const flagsPath = path.join(process.cwd(), "data", "feature-flags.json");

async function ensureFile(): Promise<FlagsRecord> {
  try {
    const raw = await fs.readFile(flagsPath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<FlagsRecord>;
    return { ...defaultFlags, ...parsed };
  } catch {
    const dir = path.dirname(flagsPath);
    await fs.mkdir(dir, { recursive: true });
    await writeFlags(defaultFlags);
    return defaultFlags;
  }
}

async function writeFlags(flags: FlagsRecord) {
  const tmpPath = `${flagsPath}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(flags, null, 2), "utf-8");
  await fs.rename(tmpPath, flagsPath);
}

export async function getFeatureFlags(): Promise<FlagsRecord> {
  return ensureFile();
}

export async function setFeatureFlag(key: FeatureFlagKey, value: boolean): Promise<void> {
  const current = await ensureFile();
  const updated: FlagsRecord = { ...current, [key]: value };
  await writeFlags(updated);
}

export function isFeatureEnabled(flags: FlagsRecord, key: FeatureFlagKey): boolean {
  return Boolean(flags[key]);
}
