/**
 * Integration tests for the session-presence check that proxy.ts performs.
 * We test verifySessionCookie() directly — proxy's readSessionPresence()
 * is a thin wrapper that pulls the cookie value and SECRET from the request
 * / env; the crypto logic lives entirely in verifySessionCookie().
 */
import { describe, it, expect } from "vitest";
import { signValue } from "@/lib/security/signedValue";
import { verifySessionCookie } from "@/lib/security/sessionCookieCodec";

const SECRET = "proxy-presence-secret";

const makeSessionCookie = (payload: Record<string, unknown>) => {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return signValue(encoded, SECRET);
};

describe("proxy session-presence: cookie missing", () => {
  it("undefined cookie → false", async () => {
    expect(await verifySessionCookie(undefined, SECRET)).toBe(false);
  });

  it("empty string cookie → false", async () => {
    expect(await verifySessionCookie("", SECRET)).toBe(false);
  });
});

describe("proxy session-presence: cookie present but invalid", () => {
  it("cookie with no signature part → false", async () => {
    expect(await verifySessionCookie("eyJyb2xlIjoiYWRtaW4ifQ", SECRET)).toBe(false);
  });

  it("cookie with fabricated signature → false", async () => {
    expect(await verifySessionCookie("eyJyb2xlIjoiYWRtaW4ifQ.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", SECRET)).toBe(false);
  });

  it("cookie signed with a different secret → false", async () => {
    const cookie = makeSessionCookie({ role: "admin", userId: "u1" });
    expect(await verifySessionCookie(cookie, "different-secret")).toBe(false);
  });

  it("cookie with tampered payload (signature mismatch) → false", async () => {
    const cookie = makeSessionCookie({ role: "admin", userId: "u1" });
    // Replace payload portion with a different base64url value, keep original sig
    const dotIdx = cookie.lastIndexOf(".");
    const sig = cookie.slice(dotIdx + 1);
    const fakePayload = Buffer.from(JSON.stringify({ role: "resident" })).toString("base64url");
    expect(await verifySessionCookie(`${fakePayload}.${sig}`, SECRET)).toBe(false);
  });
});

describe("proxy session-presence: cookie valid", () => {
  it("admin session cookie → true", async () => {
    const cookie = makeSessionCookie({ role: "admin", userId: "user-admin-root" });
    expect(await verifySessionCookie(cookie, SECRET)).toBe(true);
  });

  it("chairman session cookie → true", async () => {
    const cookie = makeSessionCookie({ role: "chairman", userId: "user-chairman-default" });
    expect(await verifySessionCookie(cookie, SECRET)).toBe(true);
  });

  it("minimal payload (empty object) still valid if signature matches → true", async () => {
    const encoded = Buffer.from("{}").toString("base64url");
    const cookie = signValue(encoded, SECRET);
    expect(await verifySessionCookie(cookie, SECRET)).toBe(true);
  });
});

describe("proxy session-presence: secret edge cases", () => {
  it("secret is whitespace only → false (no verification possible)", async () => {
    const cookie = makeSessionCookie({ role: "admin" });
    // verifySessionCookie receives the trimmed secret; if original is whitespace
    // the caller (readSessionPresence) trims to "" which hits the !secret guard
    expect(await verifySessionCookie(cookie, "")).toBe(false);
  });
});
