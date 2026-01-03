export const isServerlessReadonlyFs = (): boolean =>
  process.env.VERCEL === "1" || process.env.DISABLE_FILE_CACHE === "1";

export const warnReadonlyFs = (label: string) => {
  console.warn(`[fs-guard] ${label} skipped (readonly fs)`);
};
