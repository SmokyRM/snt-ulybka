import { describe, expect, it } from "vitest";
import { createRateLimiter, createMemoryRateLimitStore } from "@/lib/security/rateLimit";

describe("rateLimit store consistency", () => {
  it("uses shared store across instances", async () => {
    const shared = new Map<string, { count: number; resetAt: number }>();
    const store = createMemoryRateLimitStore(shared);
    const limiterA = createRateLimiter(store);
    const limiterB = createRateLimiter(store);

    const limit = 2;
    const windowMs = 10_000;

    const first = await limiterA("shared-key", limit, windowMs);
    const second = await limiterB("shared-key", limit, windowMs);
    const third = await limiterA("shared-key", limit, windowMs);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(third.ok).toBe(false);
  });
});
