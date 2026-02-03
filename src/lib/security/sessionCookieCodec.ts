/**
 * Shared codec for the signed-cookie format:  payload.base64url(HMAC-SHA-256).
 *
 * All functions here use only Web-standard APIs (TextEncoder, crypto.subtle,
 * atob) — safe to call in both Node and Edge runtimes without importing
 * node:crypto.
 */

/**
 * Split a signed token on the *last* dot.
 * Returns null for malformed input (empty, no dot, empty payload or sig).
 */
export function splitSigned(value: string): { payload: string; sig: string } | null {
  const lastDot = value.lastIndexOf(".");
  if (lastDot <= 0) return null;
  const payload = value.slice(0, lastDot);
  const sig = value.slice(lastDot + 1);
  if (!payload || !sig) return null;
  return { payload, sig };
}

/**
 * Decode a base64url string to raw bytes.
 * base64url replaces `+` → `-`, `/` → `_` and strips `=` padding.
 */
export function base64urlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Verify an HMAC-SHA-256 signature using WebCrypto (edge-safe).
 *
 * @param payloadStr  Everything before the last dot — the raw string that was signed
 * @param sigB64url   Everything after the last dot — base64url-encoded signature
 * @param secret      The signing secret (SESSION_SECRET)
 */
export async function verifyHmacSha256Edge(
  payloadStr: string,
  sigB64url: string,
  secret: string,
): Promise<boolean> {
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    // base64urlToBytes allocates a fresh ArrayBuffer — never shared.
    const sigBytes = base64urlToBytes(sigB64url);
    return await crypto.subtle.verify("HMAC", key, sigBytes.buffer as ArrayBuffer, enc.encode(payloadStr));
  } catch {
    return false;
  }
}

/**
 * Full pipeline: split + verify.  Returns false for any malformed or
 * unauthenticated input.  Safe to call with undefined / empty values.
 */
export async function verifySessionCookie(cookieValue: string | undefined, secret: string): Promise<boolean> {
  if (!cookieValue || !secret) return false;
  const parts = splitSigned(cookieValue);
  if (!parts) return false;
  return verifyHmacSha256Edge(parts.payload, parts.sig, secret);
}
