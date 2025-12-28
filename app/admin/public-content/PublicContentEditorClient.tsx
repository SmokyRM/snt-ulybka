"use client";

import dynamic from "next/dynamic";
import type { PublicContent } from "@/lib/publicContentDefaults";

type SaveResult = { ok: boolean; reason?: string };
type ResetResult = { ok: boolean; reason?: string; content: PublicContent };

type PublicContentEditorClientProps = {
  initialContent: PublicContent;
  canSave: boolean;
  onSave: (next: PublicContent) => Promise<SaveResult>;
  onReset: () => Promise<ResetResult>;
};

const PublicContentEditor = dynamic(() => import("./PublicContentEditor"), { ssr: false });

export default function PublicContentEditorClient(props: PublicContentEditorClientProps) {
  return <PublicContentEditor {...props} />;
}
