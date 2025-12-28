"use client";

import { Component, Suspense, lazy } from "react";
import type { PublicContent } from "@/lib/publicContentDefaults";

type SaveResult = { ok: boolean; reason?: string };
type ResetResult = { ok: boolean; reason?: string; content: PublicContent };

type PublicContentEditorClientProps = {
  initialContent: PublicContent;
  canSave: boolean;
  onSave: (next: PublicContent) => Promise<SaveResult>;
  onReset: () => Promise<ResetResult>;
};

const PublicContentEditor = lazy(() =>
  import("./PublicContentEditor").then((mod) => ({
    default: mod.default ?? mod.PublicContentEditor,
  }))
);

type ErrorBoundaryProps = { children: React.ReactNode };
type ErrorBoundaryState = { error: Error | null };

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
          <div className="font-semibold">Ошибка загрузки редактора</div>
          <div className="mt-2 break-words">{this.state.error.message}</div>
          <div className="mt-2 text-xs text-rose-700">
            Проверьте Network: failed chunk load / 404.
          </div>
          {process.env.NODE_ENV !== "production" && this.state.error.stack ? (
            <pre className="mt-2 whitespace-pre-wrap text-xs text-rose-700">
              {this.state.error.stack}
            </pre>
          ) : null}
        </div>
      );
    }
    return this.props.children;
  }
}

export default function PublicContentEditorClient(props: PublicContentEditorClientProps) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<div className="text-sm text-zinc-600">Загрузка редактора...</div>}>
        <PublicContentEditor {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}
