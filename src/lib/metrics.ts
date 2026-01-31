type MetricsSnapshot = Record<string, number>;

const metricsStore = new Map<string, number>();

export function incMetric(name: string, by = 1) {
  const current = metricsStore.get(name) ?? 0;
  metricsStore.set(name, current + by);
}

export function getMetricsSnapshot(): MetricsSnapshot {
  const snapshot: MetricsSnapshot = {};
  metricsStore.forEach((value, key) => {
    snapshot[key] = value;
  });
  return snapshot;
}
