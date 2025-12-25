export const isAdminNewUIEnabled = (): boolean =>
  process.env.ADMIN_FEATURE_NEW_UI === "1" || process.env.ADMIN_FEATURE_NEW_UI === "true";

