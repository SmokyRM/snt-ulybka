"use client";

import { AnimatePresence } from "framer-motion";

export default function MotionSafe({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV !== "production") {
    return <>{children}</>;
  }
  return (
    <AnimatePresence mode="wait" initial={false}>
      {children}
    </AnimatePresence>
  );
}
