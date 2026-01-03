const FALLBACK_SITE_URL = "https://sntulybka.ru";

export const getSiteUrl = (): URL => {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    FALLBACK_SITE_URL;
  const withProtocol = raw.startsWith("http") ? raw : `https://${raw}`;
  try {
    return new URL(withProtocol);
  } catch {
    return new URL(FALLBACK_SITE_URL);
  }
};
