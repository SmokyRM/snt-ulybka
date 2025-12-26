import fs from "fs/promises";
import path from "path";

export type FeatureFlagKey = "newPublicHome" | "debtsV2" | "cabinetMvp" | "forceNewHome";
export type FeatureFlags = Record<FeatureFlagKey, boolean>;

const defaultFlags: FeatureFlags = {
  newPublicHome: false,
  debtsV2: false,
  cabinetMvp: false,
  forceNewHome: false,
};

const flagsPath = path.join(process.cwd(), "data", "feature-flags.json");

async function ensureFile(): Promise<FeatureFlags> {
  try {
    const raw = await fs.readFile(flagsPath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<FeatureFlags>;
    return { ...defaultFlags, ...parsed };
  } catch {
    const dir = path.dirname(flagsPath);
    await fs.mkdir(dir, { recursive: true });
    await writeFlags(defaultFlags);
    return defaultFlags;
  }
}

async function writeFlags(flags: FeatureFlags) {
  const tmpPath = `${flagsPath}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(flags, null, 2), "utf-8");
  await fs.rename(tmpPath, flagsPath);
}

export async function getFeatureFlags(): Promise<FeatureFlags> {
  return ensureFile();
}

export async function setFeatureFlag(key: FeatureFlagKey, value: boolean): Promise<FeatureFlags> {
  const current = await ensureFile();
  const updated: FeatureFlags = { ...current, [key]: value };
  await writeFlags(updated);
  return updated;
}

export function isFeatureEnabled(flags: FeatureFlags, key: FeatureFlagKey): boolean {
  return Boolean(flags[key]);
}
