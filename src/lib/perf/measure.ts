import "server-only";

import { logStructured } from "@/lib/structuredLogger/node";

const SLOW_THRESHOLD_MS = 800;

export async function measure<T>(
  name: string,
  fn: () => Promise<T>,
  meta?: Record<string, unknown>,
  options?: { thresholdMs?: number }
): Promise<T> {
  const started = Date.now();
  try {
    return await fn();
  } finally {
    const durationMs = Date.now() - started;
    const threshold = options?.thresholdMs ?? SLOW_THRESHOLD_MS;
    const debug = process.env.DEBUG_PERF === "true";
    if (durationMs >= threshold || debug) {
      logStructured(durationMs >= threshold ? "warn" : "info", {
        action: "perf.measure",
        name,
        durationMs,
        ...(meta ?? {}),
      });
    }
  }
}
