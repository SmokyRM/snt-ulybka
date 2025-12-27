"use client";

import type { CollectionPoint } from "@/lib/analytics";
import AnalyticsBlockClient from "./AnalyticsBlockClient";

export default function AdminAnalyticsClient(props: { points: CollectionPoint[] }) {
  return <AnalyticsBlockClient {...props} />;
}
