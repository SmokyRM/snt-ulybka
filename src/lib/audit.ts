import type { ReadonlyHeaders } from "next/dist/server/web/spec-extension/adapters/headers";
import { logAdminAction as logInDb } from "@/lib/mockDb";
import { getSessionUser } from "@/lib/session.server";

const headerValue = (headers: ReadonlyHeaders | Headers | null, key: string): string | null => {
  try {
    const value = headers?.get?.(key);
    return value || null;
  } catch {
    return null;
  }
};

export const logAdminAction = async (params: {
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  meta?: Record<string, unknown> | null;
  headers?: ReadonlyHeaders | Headers | null;
  comment?: string | null;
}) => {
  const user = await getSessionUser();
  const ip =
    headerValue(params.headers ?? null, "x-forwarded-for") ||
    headerValue(params.headers ?? null, "x-real-ip");
  const userAgent = headerValue(params.headers ?? null, "user-agent");

  return logInDb({
    actorUserId: user?.id ?? null,
    actorRole: user?.role ?? null,
    action: params.action,
    entity: params.entity,
    entityId: params.entityId ?? null,
    before: params.before,
    after: params.after,
    meta: params.meta ?? null,
    ip,
    userAgent,
    comment: params.comment ?? null,
  });
};
