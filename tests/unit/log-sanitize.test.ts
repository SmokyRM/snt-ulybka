import { describe, it, expect } from "vitest";
import { sanitizeForLog } from "@/lib/structuredLogger/sanitize";

describe("sanitizeForLog", () => {
  it("redacts email, phone and tokens in strings", () => {
    const input = "Email user@example.com phone +7 (999) 123-45-67 token=abc123 Bearer xyz";
    const out = sanitizeForLog(input);
    expect(out).toContain("[REDACTED_EMAIL]");
    expect(out).toContain("[REDACTED_PHONE]");
    expect(out).toContain("token=[REDACTED]");
    expect(out).toContain("Bearer [REDACTED]");
  });

  it("redacts sensitive keys in objects", () => {
    const input = {
      email: "user@example.com",
      phone: "+79991234567",
      SESSION_SECRET: "supersecret",
      apiToken: "tok",
      nested: {
        password: "p@ss",
        ok: "value",
      },
    };
    const out = sanitizeForLog(input) as Record<string, unknown>;
    expect(out.email).toBe("[REDACTED]");
    expect(out.phone).toBe("[REDACTED]");
    expect(out.SESSION_SECRET).toBe("[REDACTED]");
    expect(out.apiToken).toBe("[REDACTED]");
    expect((out.nested as Record<string, unknown>).password).toBe("[REDACTED]");
    expect((out.nested as Record<string, unknown>).ok).toBe("value");
  });

  it("does not alter normal strings", () => {
    const input = "plain message without secrets";
    expect(sanitizeForLog(input)).toBe(input);
  });
});
