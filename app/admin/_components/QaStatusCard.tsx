import { getEffectiveSessionUser } from "@/lib/session.server";
import { qaText } from "@/lib/qaText";

export default async function QaStatusCard() {
  const effectiveSession = await getEffectiveSessionUser();
  const session = effectiveSession;

  const formatValue = (value: string | undefined | null): string => {
    return value ?? "—";
  };

  return (
    <section
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
      data-testid="qa-status-card"
    >
      <h2 className="mb-2 text-lg font-semibold text-zinc-900">{qaText.headers.status}</h2>
      <p className="mb-4 text-xs text-zinc-500" data-testid="qa-help-status">
        {qaText.hints.status}
      </p>
      <div className="space-y-4">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-zinc-800">{qaText.labels.environment}</h3>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium text-zinc-700">NODE_ENV:</span>
              <code className="rounded bg-zinc-100 px-2 py-1 font-mono text-xs text-zinc-900">
                {formatValue(process.env.NODE_ENV)}
              </code>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-zinc-700">ENABLE_QA:</span>
              <code className="rounded bg-zinc-100 px-2 py-1 font-mono text-xs text-zinc-900">
                {formatValue(process.env.ENABLE_QA)}
              </code>
            </div>
            {process.env.NEXT_PUBLIC_APP_VERSION && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-zinc-700">APP_VERSION:</span>
                <code className="rounded bg-zinc-100 px-2 py-1 font-mono text-xs text-zinc-900">
                  {process.env.NEXT_PUBLIC_APP_VERSION}
                </code>
              </div>
            )}
            {process.env.GIT_SHA && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-zinc-700">GIT_SHA:</span>
                <code className="rounded bg-zinc-100 px-2 py-1 font-mono text-xs text-zinc-900">
                  {process.env.GIT_SHA}
                </code>
              </div>
            )}
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-zinc-800">{qaText.labels.session}</h3>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium text-zinc-700">role:</span>
              <code className="rounded bg-zinc-100 px-2 py-1 font-mono text-xs text-zinc-900">
                {formatValue(session?.role)}
              </code>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-zinc-700">userId:</span>
              <code className="rounded bg-zinc-100 px-2 py-1 font-mono text-xs text-zinc-900">
                {formatValue(session?.id)}
              </code>
            </div>
            {session?.fullName && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-zinc-700">fullName:</span>
                <code className="rounded bg-zinc-100 px-2 py-1 font-mono text-xs text-zinc-900">
                  {session.fullName}
                </code>
              </div>
            )}
            {session?.email && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-zinc-700">email:</span>
                <code className="rounded bg-zinc-100 px-2 py-1 font-mono text-xs text-zinc-900">
                  {session.email}
                </code>
              </div>
            )}
            {session?.phone && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-zinc-700">phone:</span>
                <code className="rounded bg-zinc-100 px-2 py-1 font-mono text-xs text-zinc-900">
                  {session.phone}
                </code>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="font-medium text-zinc-700">isQaOverride:</span>
              <code className="rounded bg-zinc-100 px-2 py-1 font-mono text-xs text-zinc-900">
                {session?.isQaOverride ? "true" : "false"}
              </code>
            </div>
            {session?.qaScenario && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-zinc-700">qaScenario:</span>
                <code className="rounded bg-zinc-100 px-2 py-1 font-mono text-xs text-zinc-900">
                  {session.qaScenario}
                </code>
              </div>
            )}
            {session?.realRole && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-zinc-700">realRole:</span>
                <code className="rounded bg-zinc-100 px-2 py-1 font-mono text-xs text-zinc-900">
                  {session.realRole}
                </code>
              </div>
            )}
            {session?.isImpersonating && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-zinc-700">isImpersonating:</span>
                <code className="rounded bg-zinc-100 px-2 py-1 font-mono text-xs text-zinc-900">
                  {session.isImpersonating ? "true" : "false"}
                </code>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
