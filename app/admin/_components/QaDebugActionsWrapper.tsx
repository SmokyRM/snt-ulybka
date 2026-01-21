"use client";

import QaDebugActions from "./QaDebugActions";

type QaDebugActionsWrapperProps = {
  envInfo: {
    NODE_ENV: string | undefined;
    ENABLE_QA: string | undefined;
    NEXT_PUBLIC_APP_VERSION?: string;
    GIT_SHA?: string;
  };
  sessionSnapshot: {
    role?: string;
    userId?: string;
    fullName?: string;
    email?: string;
    phone?: string;
    isQaOverride?: boolean;
    qaScenario?: string | null;
    realRole?: string;
    isImpersonating?: boolean;
  };
  checksResults?: Array<{
    name: string;
    url: string;
    status: number | null;
    statusText: string;
    timeMs: number;
    error?: string;
  }>;
};

export default function QaDebugActionsWrapper(props: QaDebugActionsWrapperProps) {
  return <QaDebugActions {...props} />;
}
