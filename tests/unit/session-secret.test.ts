import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { assertSessionSecret, getSessionSecret, _resetWarnedOnce } from "@/lib/security/env";

const ORIGINAL_SECRET = process.env.SESSION_SECRET;
const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

describe("assertSessionSecret", () => {
  beforeEach(() => {
    _resetWarnedOnce();
  });

  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) {
      delete process.env.SESSION_SECRET;
    } else {
      process.env.SESSION_SECRET = ORIGINAL_SECRET;
    }
    process.env.NODE_ENV = ORIGINAL_NODE_ENV;
  });

  it("returns the secret when set", () => {
    process.env.SESSION_SECRET = "my-secret-value";
    expect(assertSessionSecret()).toBe("my-secret-value");
  });

  it("throws when SESSION_SECRET is empty string", () => {
    process.env.SESSION_SECRET = "";
    expect(() => assertSessionSecret()).toThrow("SESSION_SECRET is not set");
  });

  it("throws when SESSION_SECRET is whitespace only", () => {
    process.env.SESSION_SECRET = "   ";
    expect(() => assertSessionSecret()).toThrow("SESSION_SECRET is not set");
  });

  it("throws when SESSION_SECRET is undefined", () => {
    delete process.env.SESSION_SECRET;
    expect(() => assertSessionSecret()).toThrow("SESSION_SECRET is not set");
  });

  it("emits console.warn once in non-production, then throws", () => {
    process.env.NODE_ENV = "development";
    delete process.env.SESSION_SECRET;
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(() => assertSessionSecret()).toThrow("SESSION_SECRET is not set");
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(/\[snt\]/);
    expect(warnSpy.mock.calls[0][0]).toMatch(/SESSION_SECRET/);

    // Second call: warn should NOT fire again (single-shot)
    expect(() => assertSessionSecret()).toThrow("SESSION_SECRET is not set");
    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });

  it("does NOT emit console.warn in production", () => {
    process.env.NODE_ENV = "production";
    delete process.env.SESSION_SECRET;
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(() => assertSessionSecret()).toThrow("SESSION_SECRET is not set");
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("error message includes NODE_ENV", () => {
    process.env.NODE_ENV = "development";
    delete process.env.SESSION_SECRET;
    _resetWarnedOnce();

    try {
      assertSessionSecret();
    } catch (e) {
      expect((e as Error).message).toMatch(/NODE_ENV=development/);
    }
  });
});

describe("getSessionSecret", () => {
  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) {
      delete process.env.SESSION_SECRET;
    } else {
      process.env.SESSION_SECRET = ORIGINAL_SECRET;
    }
  });

  it("returns the secret when set", () => {
    process.env.SESSION_SECRET = "abc";
    expect(getSessionSecret()).toBe("abc");
  });

  it("returns null when missing", () => {
    delete process.env.SESSION_SECRET;
    expect(getSessionSecret()).toBeNull();
  });

  it("returns null for whitespace-only", () => {
    process.env.SESSION_SECRET = "  \t ";
    expect(getSessionSecret()).toBeNull();
  });

  it("trims the secret", () => {
    process.env.SESSION_SECRET = "  hello  ";
    expect(getSessionSecret()).toBe("hello");
  });
});

describe("createSignedSessionCookieValue — missing secret integration", () => {
  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) {
      delete process.env.SESSION_SECRET;
    } else {
      process.env.SESSION_SECRET = ORIGINAL_SECRET;
    }
    _resetWarnedOnce();
  });

  it("throws with SESSION_SECRET message when secret is not set", async () => {
    delete process.env.SESSION_SECRET;
    _resetWarnedOnce();
    // dynamic import to avoid module-level caching issues
    const { createSignedSessionCookieValue } = await import("@/lib/security/sessionCookie");
    expect(() => createSignedSessionCookieValue({ role: "admin", userId: "u1" })).toThrow("SESSION_SECRET");
  });
});
