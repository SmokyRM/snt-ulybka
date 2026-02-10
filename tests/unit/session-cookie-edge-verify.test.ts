import { describe, it, expect } from "vitest";
import { signValue } from "@/lib/security/signedValue";
import { splitSigned, base64urlToBytes, verifyHmacSha256Edge, verifySessionCookie } from "@/lib/security/sessionCookieCodec";

const SECRET = "edge-verify-test-secret";

describe("splitSigned", () => {
  it("splits payload.sig on the last dot", () => {
    expect(splitSigned("abc.def")).toEqual({ payload: "abc", sig: "def" });
  });

  it("payload may itself contain dots — splits on last", () => {
    expect(splitSigned("a.b.c")).toEqual({ payload: "a.b", sig: "c" });
  });

  it("returns null for empty string", () => {
    expect(splitSigned("")).toBeNull();
  });

  it("returns null when there is no dot", () => {
    expect(splitSigned("nodot")).toBeNull();
  });

  it("returns null when dot is at position 0 (empty payload)", () => {
    expect(splitSigned(".sig")).toBeNull();
  });

  it("returns null when sig is empty (trailing dot)", () => {
    expect(splitSigned("payload.")).toBeNull();
  });
});

describe("base64urlToBytes", () => {
  it("decodes a simple ASCII value", () => {
    // "Hello" → base64url "SGVsbG8"
    const bytes = base64urlToBytes("SGVsbG8");
    expect(Array.from(bytes)).toEqual([72, 101, 108, 108, 111]);
  });

  it("handles base64url special chars - and _", () => {
    // [0xfb, 0xff] → standard base64 "e///" with padding, base64url "e___"
    // Let's use a known mapping: bytes [0xff, 0xfe] → standard "//4=" → base64url "__4"
    const bytes = base64urlToBytes("__4");
    expect(bytes[0]).toBe(0xff);
    expect(bytes[1]).toBe(0xfe);
  });
});

describe("verifyHmacSha256Edge", () => {
  it("returns true for a signature produced by node signValue", async () => {
    const signed = signValue("hello-payload", SECRET);
    const parts = splitSigned(signed)!;
    expect(await verifyHmacSha256Edge(parts.payload, parts.sig, SECRET)).toBe(true);
  });

  it("returns false for a tampered signature", async () => {
    const signed = signValue("hello-payload", SECRET);
    const parts = splitSigned(signed)!;
    // flip last char
    const last = parts.sig.slice(-1);
    const tampered = parts.sig.slice(0, -1) + (last === "A" ? "B" : "A");
    expect(await verifyHmacSha256Edge(parts.payload, tampered, SECRET)).toBe(false);
  });

  it("returns false when the secret does not match", async () => {
    const signed = signValue("hello-payload", SECRET);
    const parts = splitSigned(signed)!;
    expect(await verifyHmacSha256Edge(parts.payload, parts.sig, "wrong-secret")).toBe(false);
  });

  it("returns false for a tampered payload (signature no longer matches)", async () => {
    const signed = signValue("original", SECRET);
    const parts = splitSigned(signed)!;
    expect(await verifyHmacSha256Edge("tampered", parts.sig, SECRET)).toBe(false);
  });

  it("returns false for malformed base64url in signature", async () => {
    expect(await verifyHmacSha256Edge("payload", "!!!not-base64!!!", SECRET)).toBe(false);
  });
});

describe("verifySessionCookie", () => {
  it("returns true for a valid cookie produced by signValue", async () => {
    const payload = Buffer.from(JSON.stringify({ role: "admin", userId: "u1" })).toString("base64url");
    const cookie = signValue(payload, SECRET);
    expect(await verifySessionCookie(cookie, SECRET)).toBe(true);
  });

  it("returns false for undefined cookie", async () => {
    expect(await verifySessionCookie(undefined, SECRET)).toBe(false);
  });

  it("returns false for empty string cookie", async () => {
    expect(await verifySessionCookie("", SECRET)).toBe(false);
  });

  it("returns false when secret is empty", async () => {
    const cookie = signValue("payload", SECRET);
    expect(await verifySessionCookie(cookie, "")).toBe(false);
  });

  it("returns false for cookie with no dot (malformed)", async () => {
    expect(await verifySessionCookie("nodothere", SECRET)).toBe(false);
  });
});
