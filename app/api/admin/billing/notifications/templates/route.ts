import { NextResponse } from "next/server";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import {
  listMessageTemplates,
  createMessageTemplate,
  updateMessageTemplate,
  deleteMessageTemplate,
  getMessageTemplate,
} from "@/lib/billing";
import type { MessageTemplate } from "@/lib/billing";
import { logAdminAction } from "@/lib/audit";
import { ok, unauthorized, forbidden, badRequest, fail, serverError } from "@/lib/api/respond";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!hasFinanceAccess(user)) {
      return unauthorized(request);
    }

    const templates = listMessageTemplates();
    return ok(request, { templates });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!hasFinanceAccess(user)) {
      return unauthorized(request);
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return badRequest(request, "Bad request");
    }

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const variables = Array.isArray(body.variables) ? body.variables.filter((v: unknown) => typeof v === "string") : [];
    const ch = body.channel;
    const channel = ch === "email" || ch === "whatsapp-draft" ? ch : "sms";

    if (!title || !message) {
      return badRequest(request, "Title and message are required");
    }

  const template = createMessageTemplate({
    title,
    message,
    variables,
    channel,
    createdByUserId: user?.id ?? null,
  });

    await logAdminAction({
      action: "message_template_created",
      entity: "message_template",
      entityId: template.id,
      after: template,
      meta: { actorUserId: user?.id ?? null, actorRole: user?.role ?? null },
    });

    return ok(request, { template });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getSessionUser();
    if (!hasFinanceAccess(user)) {
      return unauthorized(request);
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || typeof body.id !== "string") {
      return badRequest(request, "Bad request");
    }

    const id = body.id.trim();
    const title = typeof body.title === "string" ? body.title.trim() : undefined;
    const message = typeof body.message === "string" ? body.message.trim() : undefined;
    const variables = Array.isArray(body.variables) ? body.variables.filter((v: unknown) => typeof v === "string") : undefined;
    const ch = body.channel;
    const channel = ch === "email" || ch === "whatsapp-draft" ? ch : ch === "sms" ? "sms" : undefined;

    const existing = getMessageTemplate(id);
    if (!existing) {
      return fail(request, "not_found", "Template not found", 404);
    }

  const updates: Partial<{
    title: string;
    message: string;
    variables: string[];
    channel: "sms" | "email" | "whatsapp-draft";
    updatedAt: string;
  }> = {};
  if (title !== undefined) updates.title = title;
  if (message !== undefined) updates.message = message;
  if (variables !== undefined) updates.variables = variables;
  if (channel !== undefined) updates.channel = channel;

    const updated = updateMessageTemplate(id, updates);
    if (!updated) {
      return serverError(request, "Failed to update template");
    }

    await logAdminAction({
      action: "message_template_updated",
      entity: "message_template",
      entityId: id,
      before: existing,
      after: updated,
      meta: { actorUserId: user?.id ?? null, actorRole: user?.role ?? null },
    });

    return ok(request, { template: updated });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getSessionUser();
    if (!hasFinanceAccess(user)) {
      return unauthorized(request);
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return badRequest(request, "Template ID is required");
    }

    const existing = getMessageTemplate(id);
    if (!existing) {
      return fail(request, "not_found", "Template not found", 404);
    }

    const deleted = deleteMessageTemplate(id);
    if (!deleted) {
      return serverError(request, "Failed to delete template");
    }

    await logAdminAction({
      action: "message_template_deleted",
      entity: "message_template",
      entityId: id,
      before: existing,
      after: null,
      meta: { actorUserId: user?.id ?? null, actorRole: user?.role ?? null },
    });

    return ok(request, { ok: true });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}