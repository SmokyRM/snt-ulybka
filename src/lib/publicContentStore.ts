import { PUBLIC_CONTENT_DEFAULTS, type PublicContent } from "@/lib/publicContentDefaults";

type SaveResult = { ok: boolean; reason?: string };

declare global {
  // eslint-disable-next-line no-var
  var __PUBLIC_CONTENT__: PublicContent | undefined;
}

const isProd = process.env.NODE_ENV === "production";

const cloneContent = (value: PublicContent): PublicContent => {
  return JSON.parse(JSON.stringify(value)) as PublicContent;
};

export async function getPublicContent(): Promise<PublicContent> {
  if (isProd) {
    return cloneContent(PUBLIC_CONTENT_DEFAULTS);
  }

  if (!globalThis.__PUBLIC_CONTENT__) {
    globalThis.__PUBLIC_CONTENT__ = cloneContent(PUBLIC_CONTENT_DEFAULTS);
  }

  return cloneContent(globalThis.__PUBLIC_CONTENT__);
}

export async function savePublicContent(next: PublicContent): Promise<SaveResult> {
  if (isProd) {
    return { ok: false, reason: "KV not configured" };
  }

  globalThis.__PUBLIC_CONTENT__ = cloneContent(next);
  return { ok: true };
}

export async function resetPublicContent(): Promise<{ ok: boolean; content: PublicContent; reason?: string }> {
  const content = cloneContent(PUBLIC_CONTENT_DEFAULTS);

  if (isProd) {
    return { ok: false, reason: "KV not configured", content };
  }

  globalThis.__PUBLIC_CONTENT__ = cloneContent(PUBLIC_CONTENT_DEFAULTS);
  return { ok: true, content };
}
