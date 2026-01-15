"use client";

import dynamic from "next/dynamic";

type AnalyticsPoint = {
  period: string;
  membership: { accrued: number; paid: number; debt: number };
  target: { accrued: number; paid: number; debt: number };
  electricity: { accrued: number; paid: number; debt: number };
};

const AnalyticsBlockClient = dynamic<{ points: AnalyticsPoint[] }>(
  () => import("./AnalyticsBlockClient"),
  {
    ssr: false,
  }
);

type Props = { points: AnalyticsPoint[] };

export default function AnalyticsBlockLazy(props: Props) {
  return <AnalyticsBlockClient {...props} />;
}
