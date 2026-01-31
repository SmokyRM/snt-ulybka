import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { logAdminAction } from "@/lib/audit";
import { getRegistryItem, setRegistryContactVerified } from "@/lib/registry.store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requirePermission(request, "registry.edit", {
    route: "/api/office/registry/[id]/contact-verify",
    deniedReason: "registry.edit",
  });
  if (guard instanceof Response) return guard;
  const { session, requestId } = guard;
  if (!session) return fail(request, "unauthorized", "Unauthorized", 401);

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const verified = Boolean(body.verified);

    const before = getRegistryItem(id);
    if (!before) {
      return fail(request, "not_found", "Запись не найдена", 404);
    }

    const updated = setRegistryContactVerified(id, {
      verified,
      actorId: session.id ?? null,
    });

    const diff = {
      contactVerifiedAt: {
        from: before.contactVerifiedAt ?? null,
        to: updated?.contactVerifiedAt ?? null,
      },
      contactVerifiedBy: {
        from: before.contactVerifiedBy ?? null,
        to: updated?.contactVerifiedBy ?? null,
      },
    };

    await logAdminAction({
      action: "registry.update_contact",
      entity: "registry_plot",
      entityId: id,
      before,
      after: updated,
      meta: { requestId, diff },
      route: "/api/office/registry/[id]/contact-verify",
      success: true,
      headers: request.headers,
    });

    return ok(request, { item: updated });
  } catch (error) {
    return serverError(request, "Ошибка обновления контакта", error);
  }
}
